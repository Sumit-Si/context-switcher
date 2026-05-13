import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import SwitchLog, { SwitchLogSchemaProps } from "../models/switchLog.model";
import Context from "../models/context.model";
import { GetRequestPayloads, UserDocument } from "../types/common.types";
import { QueryFilter, Types } from "mongoose";


type CreateSwitchLogRequestBody = Pick<SwitchLogSchemaProps, "fromContext" | "toContext" | "ritualId" | "ritualCompleted" | "ritualSkipped" | "distraction" | "notes" | "projectTag">;

type UpdateSwitchLogRequestBody = {
    focusQuality?: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
}

const getAllSwitchLogs = asyncHandler(async (req, res) => {
    const { page: rawPage = "1", limit: rawLimit = "10", sortBy = "createdAt", order = "asc" } = req.query as unknown as GetRequestPayloads;

    const user = req.user as UserDocument;

    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 10));
    const skip = (page - 1) * limit;

    const sortOrder = order === "desc" ? -1 : 1;

    const filters: QueryFilter<SwitchLogSchemaProps> = {
        userId: user._id,
        deletedAt: null,
    }

    // Use lean for read-only queries (faster)
    const switchLogs = await SwitchLog.find(filters)
        .select("_id fromContext toContext ritualId ritualCompleted ritualSkipped distraction notes projectTag createdAt")
        .populate({
            path: "fromContext",
            select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
        })
        .populate({
            path: "toContext",
            select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
        })
        .lean()
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

    const totalSwitchLogs = await SwitchLog.countDocuments(filters);
    const totalPages = Math.ceil(totalSwitchLogs / limit);

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Switch logs fetched successfully",
            data: {
                switchLogs,
                metadata: {
                    totalPages,
                    currentPage: page,
                    currentLimit: limit,
                    totalSwitchLogs,
                }
            }
        }))
});

const createSwitchLog = asyncHandler(async (req, res) => {
    const { fromContext, toContext, ritualId, ritualCompleted, ritualSkipped, distraction, notes, projectTag } = req.body as CreateSwitchLogRequestBody;

    const user = req.user as UserDocument;

    const existingFromContext = await Context.findOne({
        userId: user._id,
        _id: fromContext,
        deletedAt: null,
    }).select("_id userId deletedAt");

    const existingToContext = await Context.findOne({
        userId: user._id,
        _id: toContext,
        deletedAt: null,
    }).select("_id userId deletedAt");

    if (!existingFromContext || !existingToContext) {
        throw new ApiError({ statusCode: 404, message: "One or both contexts not exist" });
    }

    if (fromContext.toString() === toContext.toString()) {
        throw new ApiError({ statusCode: 400, message: "Cannot switch to the same context" });
    }

    // Auto close any active session
    await SwitchLog.findOneAndUpdate(
        {
            userId: user._id,
            endTime: null,
            deletedAt: null,
        },
        {
            endTime: new Date(),
        }
    );

    try {
        const switchLog = await SwitchLog.create({
            userId: user._id,
            fromContext,
            toContext,
            startTime: new Date(),
            durationInMinutes: 0,
            ritualId: ritualId || null,
            ritualCompleted: ritualCompleted || false,
            ritualSkipped: ritualSkipped || false,
            distraction,
            notes,
            projectTag,
        });

        const createdSwitchLog = await SwitchLog.findById(switchLog._id)
            .populate({
                path: "fromContext",
                select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
            })
            .populate({
                path: "toContext",
                select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
            });

        if (!createdSwitchLog) {
            throw new ApiError({ statusCode: 500, message: "Problem while creating switch log" });
        }

        res.status(201)
            .json(new ApiResponse({
                statusCode: 201,
                message: "Context created and switch logged",
                data: createdSwitchLog,
            }));
    } catch (error) {
        throw new ApiError({ statusCode: 500, message: "Problem while creating switch log" });
    }
});

const getSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const switchLogObjectId = new Types.ObjectId(id);

    const switchLog = await SwitchLog.findOne({
        userId: user._id,
        _id: switchLogObjectId,
        deletedAt: null,
    }).select("fromContext toContext ritualId ritualCompleted ritualSkipped distraction notes projectTag createdAt")
        .populate({
            path: "fromContext",
            select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
        })
        .populate({
            path: "toContext",
            select: "name description icon color cognitiveLoad emotionalTone energyRequired createdAt",
        })
        .lean();

    if (!switchLog) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Switch log fetched successfully",
            data: switchLog,
        }));
});

const updateSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const switchLogObjectId = new Types.ObjectId(id);

    const { distraction, notes, projectTag, focusQuality } = req.body as UpdateSwitchLogRequestBody;

    const existingSwitchLog = await SwitchLog.findOne({
        userId: user._id,
        _id: switchLogObjectId,
        deletedAt: null,
    }).select("_id userId deletedAt");

    if (!existingSwitchLog) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    const updateData: Record<string, unknown> = {};
    if (focusQuality) updateData.focusQuality = focusQuality;
    if (distraction) updateData.distraction = distraction;
    if (notes) updateData.notes = notes;
    if (projectTag) updateData.projectTag = projectTag;
    // if (ritualCompleted) updateData.ritualCompleted = ritualCompleted;
    // if (ritualSkipped) updateData.ritualSkipped = ritualSkipped;

    const updateSwitchLog = await SwitchLog.findOneAndUpdate(switchLogObjectId,
        updateData,
        { new: true });

    if (!updateSwitchLog) {
        throw new ApiError({ statusCode: 500, message: "Problem while updating switch log" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Switchlog updated successfully",
            data: updateSwitchLog
        }));
});

const deleteSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const switchLogObjectId = new Types.ObjectId(id);

    const existingSwitchLog = await SwitchLog.findOne({
        userId: user._id,
        _id: switchLogObjectId,
        deletedAt: null,
    }).select("_id userId deletedAt");

    if (!existingSwitchLog) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    const deleteSwitchLog = await SwitchLog.findByIdAndUpdate(switchLogObjectId, {
        deletedAt: new Date(),
    }, {
        new: true, select: "_id"
    });

    if (!deleteSwitchLog) {
        throw new ApiError({ statusCode: 500, message: "Problem while deleting switch log" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Switchlog deleted successfully",
            data: deleteSwitchLog,
        }));
});

const getActiveSession = asyncHandler(async (req, res) => {
    const user = req.user as UserDocument;

    const switchLog = await SwitchLog.findOne({
        userId: user._id,
        endTime: null,
        deletedAt: null,
    }).populate("fromContext", "name description icon color cognitiveLoad emotionalTone energyRequired createdAt")
        .populate("toContext", "name description icon color cognitiveLoad emotionalTone energyRequired createdAt");

    if (!switchLog) {
        return res.status(200)
            .json(new ApiResponse({
                statusCode: 200,
                message: "No active session",
                data: null,
            }));
    }

    // Live duration — calculated server-side so client doesn't need to track startTime
    switchLog.durationInMinutes = Math.floor(
        (Date.now() - switchLog.startTime.getTime()) / (1000 * 60)
    );

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Active session fetched",
            data: switchLog,
        }));
});

const endSession = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const switchLogObjectId = new Types.ObjectId(id);

    const switchLog = await SwitchLog.findOne({
        userId: user._id,
        _id: switchLogObjectId,
        endTime: null,
        deletedAt: null,
    }).select("_id userId startTime endTime durationInMinutes ritualId ritualCompleted ritualSkipped focusQuality deletedAt");

    if (!switchLog) {
        throw new ApiError({ statusCode: 404, message: "Switch log not exists" });
    }

    const endTime = new Date();
    switchLog.endTime = endTime;
    switchLog.durationInMinutes = (endTime.getTime() - switchLog.startTime.getTime()) / (1000 * 60);
    await switchLog.save();

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Session ended",
            data: switchLog,
        }));
});



export {
    getAllSwitchLogs,
    createSwitchLog,
    getSwitchLogById,
    updateSwitchLogById,
    deleteSwitchLogById,
    getActiveSession,
    endSession,
}