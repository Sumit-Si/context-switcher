import { Types } from "mongoose";
import Ritual from "../models/ritual.model";
import type { UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import logger from "../config/logger";
import { RitualService } from "../services/ritual.service";

const ritualService = new RitualService();

interface CreateRitualRequestBody {
  name: string;
  description?: string;
  ritualType: string;
  totalDuration: number;
  steps: Array<{
    type: string;
    duration: number;
    prompt: string;
    audioFile?: string;
  }>;
  targetTransition?: {
    fromContext?: string | null;
    toContext?: string | null;
  };
}

interface UpdateRitualRequestBody {
  name?: string;
  description?: string;
  steps?: Array<{
    type: string;
    duration: number;
    prompt: string;
    audioFile?: string;
  }>;
  totalDuration?: number;
}

const getAllRituals = asyncHandler(async (req, res) => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const user = req.user as UserDocument;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 50);

  const result = await ritualService.getAll(user._id.toString(), {
    page: pageNum,
    limit: limitNum,
    sortBy: sortBy as string,
    sortOrder: order === "asc" ? "asc" : "desc",
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Rituals fetched successfully",
      data: {
        rituals: result.data,
        metadata: {
          totalPages: result.pagination.totalPages,
          currentPage: result.pagination.page,
          currentLimit: result.pagination.limit,
          totalRituals: result.pagination.total,
        },
      },
    }),
  );
});

const createRitual = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    ritualType,
    totalDuration,
    steps,
    targetTransition,
  } = req.body as CreateRitualRequestBody;
  const user = req.user as UserDocument;

  const ritual = await ritualService.create(
    {
      name,
      description,
      ritualType,
      totalDuration,
      steps,
      targetTransition,
    },
    user._id.toString(),
  );

  logger.info("RITUAL_CREATED", {
    meta: {
      userId: user._id.toString(),
      ritualId: (ritual as any)._id?.toString() || "unknown",
      name: ritual.name,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(201).json(
    new ApiResponse({
      statusCode: 201,
      message: "Ritual created successfully",
      data: ritual,
    }),
  );
});

const getRitualById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  const ritual = await ritualService.getById(id, user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Ritual fetched successfully",
      data: ritual,
    }),
  );
});

const updateRitualById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  const { name, description, steps, totalDuration } =
    req.body as UpdateRitualRequestBody;

  const updatedRitual = await ritualService.update(
    id,
    {
      name,
      description,
      steps,
      totalDuration,
    },
    user._id.toString(),
  );

  logger.info("RITUAL_UPDATED", {
    meta: {
      userId: user._id.toString(),
      ritualId: (updatedRitual as any)._id?.toString() || id,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Ritual updated successfully",
      data: updatedRitual,
    }),
  );
});

const deleteRitualById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  await ritualService.delete(id, user._id.toString());

  logger.info("RITUAL_DELETED", {
    meta: {
      userId: user._id.toString(),
      ritualId: id,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Ritual deleted successfully",
      data: null,
    }),
  );
});

// ── INCREMENT USED COUNT ───────────────────────────────────────────────────────
// Called when user actually completes a ritual during a context switch
const incrementRitualUsage = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;
  const ritualObjectId = new Types.ObjectId(id);

  const updated = await Ritual.findByIdAndUpdate(
    { _id: ritualObjectId, userId: user._id, deletedAt: null },
    { $inc: { usedCount: 1 } }, // atomic increment — safe for concurrent requests
    { returnDocument: "after", select: "_id usedCount" },
  );

  if (!updated) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while updating ritual count",
    });
  }

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Usage recorded",
      data: updated,
    }),
  );
});

export {
  getAllRituals,
  createRitual,
  getRitualById,
  updateRitualById,
  deleteRitualById,
  incrementRitualUsage,
};
