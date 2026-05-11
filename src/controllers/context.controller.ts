import { QueryFilter, Types } from "mongoose";
import Context, { ContextSchemaProps } from "../models/context.model";
import { CognitiveLoad, GetRequestPayloads, UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import logger from "../config/logger";


type CreateContextReqBody = Pick<ContextSchemaProps, "name" | "description" | "color" | "icon" | "cognitiveLoad" | "emotionalTone" | "energyRequired" | "musicSuggestion" | "environmentNote">;

type UpdateContextReqBody = {
    name?: string;
    color?: string;
    description?: string;
    icon?: string;
    energyRequired?: string;
    emotionalTone?: string;
    cognitiveLoad?: CognitiveLoad;
}

const getAllContexts = asyncHandler(async (req, res) => {
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

    const filters: QueryFilter<ContextSchemaProps> = {
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
    const contexts = await Context.find(filters)
        .select("name description icon color cognitiveLoad emotionalTone musicSuggestion environmentNote energyRequired createdAt")
        .lean()
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

    const totalContexts = await Context.countDocuments(filters);
    const totalPages = Math.ceil(totalContexts / limit);

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Contexts fetched successfully",
            data: {
                contexts,
                metadata: {
                    totalPages,
                    currentPage: page,
                    currentLimit: limit,
                    totalContexts,
                }
            }
        }))
});

const createContext = asyncHandler(async (req, res) => {
    const { name, description, color, icon, cognitiveLoad, emotionalTone, energyRequired, musicSuggestion, environmentNote } = req.body as CreateContextReqBody;

    const user = req.user as UserDocument;

    const existingContext = await Context.findOne({
        name,
        userId: user._id,
        deletedAt: null,
    }).select("_id name deletedAt");

    if (existingContext) {
        throw new ApiError({
            statusCode: 400,
            message: "Context already exists",
        });
    }

    try {
        const context = await Context.create({
            name,
            description,
            icon,
            color,
            cognitiveLoad,
            emotionalTone,
            energyRequired,
            userId: user._id,
            environmentNote,
            musicSuggestion,
        });

        const createdContext = await Context.findById(context._id)
            .select("_id name icon description color cognitiveLoad energyRequired musicSuggestion environmentNote emotionalTone");

        if (!createdContext) {
            throw new ApiError({ statusCode: 500, message: "Problem while creating context" });
        }

        logger.info("Context created", {
            meta: {
                userId: user._id.toString(),
                contextId: context._id.toString(),
                name: context.name,
                requestId: req.headers["x-request-id"],
            }
        });

        res.status(201)
            .json(new ApiResponse({
                statusCode: 201,
                message: "Context created successfully",
                data: createdContext,
            }));
    } catch (error: any) {
        if (error.code === 11000) {
            throw new ApiError({
                statusCode: 409,
                message: "Context with this name already exists"
            });
        }

        throw new ApiError({ statusCode: 500, message: "Problem while creating context" });
    }

});

const getContextById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const contextObjectId = new Types.ObjectId(id);
    const user = req.user as UserDocument;

    const context = await Context.findOne({
        _id: contextObjectId,
        userId: user._id,
        deletedAt: null,
    });

    if (!context) {
        throw new ApiError({ statusCode: 404, message: "Context not exists" });
    }

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Context fetched successfully",
            data: context,
        }))
})

const updateContextById = asyncHandler(async (req, res) => {
    const { name, color, emotionalTone, icon, energyRequired, description, cognitiveLoad } = req.body as UpdateContextReqBody;

    const { id } = req.params as { id: string };
    const contextObjectId = new Types.ObjectId(id);
    const user = req.user as UserDocument;

    const existingContext = await Context.findOne({
        _id: contextObjectId,
        userId: user._id,
        deletedAt: null,
    }).select("name _id deletedAt");

    if (!existingContext) {
        throw new ApiError({ statusCode: 404, message: "Context not exists" });
    }

    if (name && name !== existingContext.name) {
        const alreadyExists = await Context.findOne({
            name,
            userId: user._id,
            deletedAt: null,
        }).select("_id");

        if (alreadyExists) {
            throw new ApiError({
                statusCode: 409,
                message: "Context with this name already exists",
            });
        }
    }

    try {
        const updatedContext = await Context.findByIdAndUpdate(contextObjectId, {
            name,
            cognitiveLoad,
            color,
            icon,
            emotionalTone,
            energyRequired,
            description,
        }, { new: true })
            .populate("userId", "username email avatar");

        if (!updatedContext) {
            throw new ApiError({ statusCode: 500, message: "Problem while updating context" });
        }

        logger.info("Context updated", {
            meta: {
                userId: user._id.toString(),
                contextId: id,
                requestId: req.headers["x-request-id"],
            }
        });

        res.status(200)
            .json(new ApiResponse({
                statusCode: 200,
                message: "Context updated successfully",
                data: updatedContext,
            }))
    } catch (error) {
        throw new ApiError({ statusCode: 500, message: "Problem while updating context" });
    }
});

const deleteContextById = asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };
    const contextObjectId = new Types.ObjectId(id);
    const user = req.user as UserDocument;

    const existingContext = await Context.findOne({
        _id: contextObjectId,
        userId: user._id,
        deletedAt: null,
    }).select("name _id deletedAt");

    if (!existingContext) {
        throw new ApiError({ statusCode: 404, message: "Context not exists" });
    }

    try {
        const deleteContext = await Context.findByIdAndUpdate({
            _id: contextObjectId,
            userId: user._id,
            deletedAt: null,
        }, {
            deletedAt: new Date(),
        }, { new: true, select: "_id name" });

        if (!deleteContext) {
            throw new ApiError({ statusCode: 500, message: "Problem while deleting context" });
        }

        logger.info("Context deleted (soft)", {
            meta: {
                userId: user._id.toString(),
                contextId: id,
                requestId: req.headers["x-request-id"],
            }

        });

        res.status(200)
            .json(new ApiResponse({
                statusCode: 200,
                message: "Context deleted successfully",
                data: deleteContext,
            }))
    } catch (error) {
        throw new ApiError({ statusCode: 500, message: "Problem while deleting context" });
    }
});


export {
    getAllContexts,
    createContext,
    getContextById,
    updateContextById,
    deleteContextById,
}