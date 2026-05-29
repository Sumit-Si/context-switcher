import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import type { UserDocument } from "../types/common.types";
import logger from "../config/logger";
import { SwitchLogService } from "../services/switchLog.service";

const switchLogService = new SwitchLogService();

interface CreateSwitchLogRequestBody {
    fromContext?: string | null;
    toContext: string;
    ritualId?: string | null;
    ritualCompleted?: boolean;
    ritualSkipped?: boolean;
    focusQuality?: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
}

interface UpdateSwitchLogRequestBody {
    focusQuality?: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
}

const getAllSwitchLogs = asyncHandler(async (req, res) => {
    const { page = "1", limit = "10", sortBy = "startTime", order = "desc" } = req.query;

    const user = req.user as UserDocument;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(Math.max(1, Number(limit)), 50);

    const result = await switchLogService.getAll(user._id.toString(), {
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy as string,
        sortOrder: order === "asc" ? "asc" : "desc"
    });

    res.status(200).json(new ApiResponse({
        statusCode: 200,
        message: "Switch logs fetched successfully",
        data: {
            switchLogs: result.data,
            metadata: {
                totalPages: result.pagination.totalPages,
                currentPage: result.pagination.page,
                currentLimit: result.pagination.limit,
                totalSwitchLogs: result.pagination.total,
            },
        },
    }));
});

const createSwitchLog = asyncHandler(async (req, res) => {
    const {
        fromContext, toContext, ritualId,
        ritualCompleted, ritualSkipped,
        distraction, focusQuality, notes, projectTag,
    } = req.body as CreateSwitchLogRequestBody;

    const user = req.user as UserDocument;

    const switchLog = await switchLogService.create({
        fromContext,
        toContext,
        ritualId,
        ritualCompleted,
        ritualSkipped,
        distraction,
        focusQuality,
        notes,
        projectTag
    }, user._id.toString());

    logger.info("SWITCH_LOG_CREATED", {
        meta: {
            userId: user._id.toString(),
            switchLogId: (switchLog as any)._id?.toString() || "unknown",
            requestId: req.headers["x-request-id"],
        },
    })

    res.status(201).json(new ApiResponse({
        statusCode: 201,
        message: "Context switch logged",
        data: switchLog,
    }));
});

const getSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const switchLog = await switchLogService.getById(id, user._id.toString());

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log fetched", data: switchLog,
    }));
});

const updateSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const { focusQuality, distraction, notes, projectTag } = req.body as UpdateSwitchLogRequestBody;

    const updated = await switchLogService.update(id, {
        focusQuality,
        distraction,
        notes,
        projectTag
    }, user._id.toString());

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log updated", data: updated,
    }));
});

const deleteSwitchLogById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    await switchLogService.delete(id, user._id.toString());

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Switch log deleted", data: null,
    }));
});

const getActiveSession = asyncHandler(async (req, res) => {
    const user = req.user as UserDocument;

    const switchLog = await switchLogService.getActiveSession(user._id.toString());

    if (!switchLog) {
        return res.status(200).json(new ApiResponse({
            statusCode: 200, message: "No active session", data: null,
        }));
    }

    return res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Active session fetched", data: switchLog,
    }));
});

const endSession = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;

    const switchLog = await switchLogService.endSession(id, user._id.toString());

    res.status(200).json(new ApiResponse({
        statusCode: 200, message: "Session ended", data: switchLog,
    }));
});

export {
    getAllSwitchLogs, createSwitchLog, getSwitchLogById,
    updateSwitchLogById, deleteSwitchLogById, getActiveSession, endSession,
};