import { QueryFilter, Types } from "mongoose";
import Ritual, { RitualSchemaProps, StepsProps } from "../models/ritual.model";
import { GetRequestPayloads, UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import { RitualType } from "../constants";


type CreateRitualRequestBody = Pick<RitualSchemaProps, "name" | "ritualType" | "totalDuration" | "steps" | "targetTransition">;

type UpdateRitualRequestBody = {
    name?: string;
    description?: string;
    steps?: StepsProps[];
};

const getAllRituals = asyncHandler(async (req, res) => {
    const { page: rawPage = "1", limit: rawLimit = "10", sortBy = "createdAt", order = "asc", search } = req.query as unknown as GetRequestPayloads;

    const user = req.user as UserDocument;

    let page = Number(rawPage);
    let limit = Number(rawLimit);

    if (page < 1 || (limit < 1 || limit >= 50)) {
        page = 1;
        limit = 10;
    }

    const skip = (page - 1) * limit;

    const sortOrder = order === "desc" ? -1 : 1;

    const filters: QueryFilter<RitualSchemaProps> = {
        userId: user._id,
        deletedAt: null,
    }

    if (search) {
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]]/g, "\\$&");
        filters.$or = [
            { name: { $regex: sanitizedSearch, $options: "i" } },
            { description: { $regex: sanitizedSearch, $options: "i" } }
        ]
    }

    // Use lean for read-only queries (faster)
    const rituals = await Ritual.find(filters)
        .select("name description ritualType steps totalDuration targetTransition createdAt updatedAt")
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
    const { name, ritualType, totalDuration, steps, targetTransition } = req.body as CreateRitualRequestBody;
    const user = req.user as UserDocument;

    const existingRitual = await Ritual.findOne({
        name,
        userId: user._id,
        deletedAt: null,
    }).select("_id");

    if (existingRitual) {
        throw new ApiError({ statusCode: 400, message: "Ritual already exists" });
    }

    try {
        const ritual = await Ritual.create({
            name,
            userId: user._id,
            ritualType,
            totalDuration,
            steps,
            targetTransition,
        });

        const createdRitual = await Ritual.findById(ritual._id)
            .select("_id name ritualType totalDuration steps targetTransition");

        if (!createdRitual) {
            throw new ApiError({ statusCode: 500, message: "Problem while creating ritual" });
        }

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
    }).select("_id name ritualType totalDuration steps targetTransition");

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
    });

    if (!ritual) {
        throw new ApiError({ statusCode: 404, message: "Ritual not exists" });
    }

    const updateRitual = await Ritual.findByIdAndUpdate(ritualObjectId, {
        name,
        description,
        steps,
    }, { new: true });

    if (!updateRitual) {
        throw new ApiError({ statusCode: 500, message: "Problem while updating ritual" });
    }

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
    });

    if (!ritual) {
        throw new ApiError({ statusCode: 404, message: "Ritual not exists" });
    }

    const deleteRitual = await Ritual.findByIdAndUpdate(ritualObjectId, {
        deletedAt: new Date(),
    }, { new: true });

    if (!deleteRitual) {
        throw new ApiError({ statusCode: 500, message: "Problem while deleting ritual" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Ritual deleted successfully",
            data: deleteRitual
        }));
});


export {
    getAllRituals,
    createRitual,
    getRitualById,
    updateRitualById,
    deleteRitualById,
}