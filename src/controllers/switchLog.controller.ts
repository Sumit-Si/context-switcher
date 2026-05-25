import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import SwitchLog, { SwitchLogSchemaProps } from "../models/switchLog.model";
import Context from "../models/context.model";
import { GetRequestPayloads, UserDocument } from "../types/common.types";
import { QueryFilter, Types } from "mongoose";
import logger from "../config/logger";

type CreateSwitchLogRequestBody = Pick<
    SwitchLogSchemaProps,
    "fromContext" | "toContext" | "ritualId" | "ritualCompleted" |
    "ritualSkipped" | "focusQuality" | "distraction" | "notes" | "projectTag"
>;

type UpdateSwitchLogRequestBody = {
    focusQuality?: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
    ritualCompleted?: boolean;  // FIX: was commented out
    ritualSkipped?: boolean;  // FIX: was commented out
};

// One shared populate config — change once, applies everywhere
const CONTEXT_POPULATE = {
    select: "_id name icon color cognitiveLoad emotionalTone energyRequired",
};

// Shared select string for all read queries
const SWITCH_LOG_SELECT =
    "_id fromContext toContext ritualId ritualCompleted ritualSkipped " +
    "focusQuality durationInMinutes startTime endTime " +  // FIX: these were missing
    "distraction notes projectTag createdAt";

// ── GET ALL ───────────────────────────────────────────────────────────────────
const getAllSwitchLogs = asyncHandler(async (req, res) => {
    const {
        page: rawPage = "1",
        limit: rawLimit = "10",
        sortBy = "startTime",
        order = "desc",   // newest first by default
    } = req.query as unknown as GetRequestPayloads;

    const user = req.user as UserDocument;
    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 10));
    const skip = (page - 1) * limit;

    const sortOrder = order === "desc" ? -1 : 1;

    const filters: QueryFilter<SwitchLogSchemaProps> = {
        userId: user._id,
        deletedAt: null,
    };

    const switchLogs = await SwitchLog.find(filters)
        .select(SWITCH_LOG_SELECT)
        .populate({ path: "fromContext", ...CONTEXT_POPULATE })
        .populate({ path: "toContext", ...CONTEXT_POPULATE })
        .lean()
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

    const totalSwitchLogs = await SwitchLog.countDocuments(filters);
    const totalPages = Math.ceil(totalSwitchLogs / limit);

    res.status(200).json(new ApiResponse({
        statusCode: 200,
        message: "Switch logs fetched successfully",
        data: {
            switchLogs,
            metadata: {
                totalPages,
                currentPage: page,
                currentLimit: limit,
                totalSwitchLogs,
            },
        },
    }));
});

// ── CREATE ────────────────────────────────────────────────────────────────────
const createSwitchLog = asyncHandler(async (req, res) => {
    const {
        fromContext, toContext, ritualId,
        ritualCompleted, ritualSkipped,
        distraction, focusQuality, notes, projectTag,
    } = req.body as CreateSwitchLogRequestBody;

    const user = req.user as UserDocument;

    // Validate toContext belongs to this user
    const existingToContext = await Context.findOne({
        _id: toContext, userId: user._id, deletedAt: null,
    }).select("_id");
    if (!existingToContext) {
        throw new ApiError({ statusCode: 404, message: "Destination context not exists" });
    }

    // Validate fromContext only when provided (null = fresh start)
    if (fromContext) {
        const existingFromContext = await Context.findOne({
            _id: fromContext, userId: user._id, deletedAt: null,
        }).select("_id");

        if (!existingFromContext) {
            throw new ApiError({ statusCode: 404, message: "Source context not exists" });
        }

        // FIX 1: same-context check now runs independently, not inside the !exists block
        if (fromContext.toString() === toContext.toString()) {
            throw new ApiError({ statusCode: 400, message: "Cannot switch to the same context" });
        }
    }

    // Auto-close any open session — only one active session allowed per user
    await SwitchLog.findOneAndUpdate(
        { userId: user._id, endTime: null, deletedAt: null },
        { endTime: new Date() },
        { returnDocument: 'after' }
    );

    // FIX 2: no try/catch — asyncHandler handles errors. Real error messages surface.
    // FIX 3: fromContext used directly, not `fromContext || null`
    const switchLog = await SwitchLog.create({
        userId: user._id,
        fromContext: fromContext || null,  // null is valid for fresh starts
        toContext,
        startTime: new Date(),           // always server-set
        durationInMinutes: 0,
        ritualId: ritualId || null,
        ritualCompleted: ritualCompleted ?? false,
        ritualSkipped: ritualSkipped ?? false,
        distraction,
        focusQuality,
        notes,
        projectTag,
    });

    const created = await SwitchLog.findById(switchLog._id)
        .populate({ path: "fromContext", ...CONTEXT_POPULATE })
        .populate({ path: "toContext", ...CONTEXT_POPULATE });

    if (!created) {
        throw new ApiError({ statusCode: 500, message: "Failed to retrieve created log" });
    }

    logger.info("SWITCH_LOG_CREATED", {
        meta: {
            userId: user._id.toString(),
            switchLogId: created._id.toString(),
            requestId: req.headers["x-request-id"],
        },
    })

    res.status(201).json(new ApiResponse({
        statusCode: 201,
        message: "Context switch logged",
        data: created,
    }));
});

const getSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const switchLog = await SwitchLog.findOne({
        _id: new Types.ObjectId(id), userId: user._id, deletedAt: null,
    })
        .select(SWITCH_LOG_SELECT)
        .populate({ path: "fromContext", ...CONTEXT_POPULATE })
        .populate({ path: "toContext", ...CONTEXT_POPULATE })
        .lean();

    if (!switchLog) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log fetched", data: switchLog,
    }));
});

const updateSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const { focusQuality, distraction, notes, projectTag, ritualCompleted, ritualSkipped } =
        req.body as UpdateSwitchLogRequestBody;

    const exists = await SwitchLog.findOne({
        _id: new Types.ObjectId(id), userId: user._id, deletedAt: null,
    }).select("_id");

    if (!exists) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    const updateData: Record<string, unknown> = {};
    // FIX 5: !== undefined guards work for all values including 0 and false
    if (focusQuality) updateData.focusQuality = focusQuality;
    if (distraction) updateData.distraction = distraction;
    if (notes) updateData.notes = notes;
    if (projectTag) updateData.projectTag = projectTag;
    if (ritualCompleted) updateData.ritualCompleted = ritualCompleted; // FIX 5
    if (ritualSkipped) updateData.ritualSkipped = ritualSkipped;   // FIX 5

    // FIX 4: first arg is a filter object { _id: ... }, not a bare ObjectId
    const updated = await SwitchLog.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        updateData,
        { returnDocument: 'after', select: SWITCH_LOG_SELECT }
    );

    if (!updated) {
        throw new ApiError({ statusCode: 500, message: "Failed to update switch log" });
    }

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log updated", data: updated,
    }));
});

const deleteSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const exists = await SwitchLog.findOne({
        _id: new Types.ObjectId(id), userId: user._id, deletedAt: null,
    }).select("_id");

    if (!exists) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    const deleted = await SwitchLog.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { returnDocument: 'after', select: "_id" }
    );

    if (!deleted) {
        throw new ApiError({ statusCode: 500, message: "Failed to delete switch log" });
    }

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log deleted", data: deleted,
    }));
});

const getActiveSession = asyncHandler(async (req, res) => {
    const user = req.user as UserDocument;

    const switchLog = await SwitchLog.findOne({
        userId: user._id, endTime: null, deletedAt: null,
    })
        .populate({ path: "fromContext", ...CONTEXT_POPULATE })
        .populate({ path: "toContext", ...CONTEXT_POPULATE });

    if (!switchLog) {
        return res.status(200).json(new ApiResponse({
            statusCode: 200, message: "No active session", data: null,
        }));
    }

    // Live duration — server calculated so refresh doesn't reset elapsed
    switchLog.durationInMinutes = Math.floor(
        (Date.now() - switchLog.startTime.getTime()) / (1000 * 60)
    );

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Active session fetched", data: switchLog,
    }));
});

const endSession = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const switchLog = await SwitchLog.findOne({
        _id: new Types.ObjectId(id),
        userId: user._id,
        endTime: null,
        deletedAt: null,
        // startTime is included — needed to calculate duration
    }).select("_id userId startTime endTime durationInMinutes ritualCompleted ritualSkipped focusQuality");

    if (!switchLog) {
        throw new ApiError({ statusCode: 404, message: "Active session not exists" });
    }

    const endTime = new Date();
    switchLog.endTime = endTime;
    switchLog.durationInMinutes = (endTime.getTime() - switchLog.startTime.getTime()) / (1000 * 60);
    await switchLog.save();

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Session ended", data: switchLog,
    }));
});

export {
    getAllSwitchLogs, createSwitchLog, getSwitchLogById,
    updateSwitchLogById, deleteSwitchLogById, getActiveSession, endSession,
};