import { QueryFilter, Types } from "mongoose";
import Ritual, { RitualSchemaProps } from "../models/ritual.model";
import { GetRequestPayloads, StepsProps, UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import logger from "../config/logger";


type CreateRitualRequestBody = Pick<RitualSchemaProps, "name" | "description" | "ritualType" | "totalDuration" | "steps" | "targetTransition">;

type UpdateRitualRequestBody = {
    name?: string;
    description?: string;
    steps?: StepsProps[];
    totalDuration?: number;
};

const getAllRituals = asyncHandler(async (req, res) => {
    const { page: rawPage = "1", limit: rawLimit = "10", sortBy = "createdAt", order = "asc", search } = req.query as unknown as GetRequestPayloads;

    const user = req.user as UserDocument;
    const page = Math.max(1, Number(rawPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 10));
    const skip = (page - 1) * limit;

    const sortOrder = order === "desc" ? -1 : 1;

    const filters: QueryFilter<RitualSchemaProps> = {
        userId: user._id,
        deletedAt: null,
    }

    if (search) {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filters.$or = [
            { name: { $regex: sanitizedSearch, $options: "i" } },
            { description: { $regex: sanitizedSearch, $options: "i" } }
        ]
    }

    // Use lean for read-only queries (faster)
    const rituals = await Ritual.find(filters)
        .select("_id name description ritualType steps totalDuration targetTransition usedCount isDefault createdAt updatedAt")
        .lean()
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

    const totalRituals = await Ritual.countDocuments(filters);
    const totalPages = Math.ceil(totalRituals / limit);

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Rituals fetched successfully",
            data: {
                rituals,
                metadata: {
                    totalPages,
                    currentPage: page,
                    currentLimit: limit,
                    totalRituals,
                }
            }
        }))
});

const createRitual = asyncHandler(async (req, res) => {
    const { name, description, ritualType, totalDuration, steps, targetTransition } = req.body as CreateRitualRequestBody;
    const user = req.user as UserDocument;

    const existingRitual = await Ritual.findOne({
        name,
        userId: user._id,
        deletedAt: null,
    }).select("_id");
    

    if (existingRitual) {
        throw new ApiError({ statusCode: 409, message: "Ritual already exists" });
    }

    try {
        const ritual = await Ritual.create({
            name,
            description,
            userId: user._id,
            ritualType,
            totalDuration,
            steps,
            targetTransition,
        });

        const createdRitual = await Ritual.findById(ritual._id)
            .select("_id name description ritualType totalDuration steps targetTransition usedCount isDefault createdAt");

        if (!createdRitual) {
            throw new ApiError({ statusCode: 500, message: "Problem while creating ritual" });
        }

        logger.info("RITUAL_CREATED", {
            meta: {
                userId: user._id.toString(),
                ritualId: createdRitual._id.toString(),
                name: ritual.name,
                requestId: req.headers["x-request-id"],
            },
        });

        res.status(201)
            .json(new ApiResponse({
                statusCode: 201,
                message: "Ritual created successfully",
                data: createdRitual,
            }));
    } catch (error) {
        throw new ApiError({ statusCode: 500, message: "Problem while creating ritual" });
    }
});

const getRitualById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const ritualObjectId = new Types.ObjectId(id);

    const ritual = await Ritual.findOne({
        _id: ritualObjectId,
        deletedAt: null,
        userId: user._id,
    }).select("_id name description ritualType totalDuration steps targetTransition usedCount isDefault");

    if (!ritual) {
        throw new ApiError({ statusCode: 404, message: "Ritual not exists" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Ritual fetched successfully",
            data: ritual
        }));
});

const updateRitualById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const ritualObjectId = new Types.ObjectId(id);

    const { name, description, steps } = req.body as UpdateRitualRequestBody;

    const ritual = await Ritual.findOne({
        _id: ritualObjectId,
        deletedAt: null,
        userId: user._id,
    }).select("_id");

    if (!ritual) {
        throw new ApiError({ statusCode: 404, message: "Ritual not exists" });
    }

    // Only update necessary fields that was sent by user
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (steps) updateData.steps = steps;

    const updateRitual = await Ritual.findByIdAndUpdate(ritualObjectId,
        updateData,
        { new: true, select: "_id name description ritualType totalDuration steps targetTransition usedCount updatedAt" });

    if (!updateRitual) {
        throw new ApiError({ statusCode: 500, message: "Problem while updating ritual" });
    }

    logger.info("RITUAL_UPDATED", {
        meta: {
            userId: user._id.toString(),
            ritualId: updateRitual._id.toString(),
            requestId: req.headers["x-request-id"],
        },
    });

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Ritual updated successfully",
            data: updateRitual
        }));
});

const deleteRitualById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const ritualObjectId = new Types.ObjectId(id);

    const ritual = await Ritual.findOne({
        _id: ritualObjectId,
        deletedAt: null,
        userId: user._id,
    }).select("_id");

    if (!ritual) {
        throw new ApiError({ statusCode: 404, message: "Ritual not exists" });
    }

    const deleteRitual = await Ritual.findByIdAndUpdate(ritualObjectId, {
        deletedAt: new Date(),
    }, { new: true, select: "_id name" });

    if (!deleteRitual) {
        throw new ApiError({ statusCode: 500, message: "Problem while deleting ritual" });
    }

    logger.info("RITUAL_DELETED", {
        meta: {
            userId: user._id.toString(),
            ritualId: deleteRitual._id.toString(),
            requestId: req.headers["x-request-id"],
        },
    });

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Ritual deleted successfully",
            data: deleteRitual
        }));
});

// ── INCREMENT USED COUNT ───────────────────────────────────────────────────────
// Called when user actually completes a ritual during a context switch
const incrementRitualUsage = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const user = req.user as UserDocument;
    const ritualObjectId = new Types.ObjectId(id);

    const updated = await Ritual.findByIdAndUpdate(
        { _id: ritualObjectId, userId: user._id, deletedAt: null },
        { $inc: { usedCount: 1 } },  // atomic increment — safe for concurrent requests
        { new: true, select: "_id usedCount" }
    );

    if (!updated) {
        throw new ApiError({ statusCode: 500, message: "Problem while updating ritual count" });
    }

    res.status(200).json(new ApiResponse({
        statusCode: 200,
        message: "Usage recorded",
        data: updated,
    }));
});


export {
    getAllRituals,
    createRitual,
    getRitualById,
    updateRitualById,
    deleteRitualById,
    incrementRitualUsage,
}