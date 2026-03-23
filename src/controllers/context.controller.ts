import { QueryFilter, Types } from "mongoose";
import Context, { ContextSchemaProps } from "../models/context.model";
import { GetRequestPayloads, UserDocument } from "../types/common.types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";


type CreateContextReqBody = Pick<ContextSchemaProps, "name" | "description" | "color" | "icon" | "cognitiveLoad" | "emotionalTone" | "energyRequired" | "isDefault">;

type UpdateContextReqBody = {
    color?: string;
    description?: string;
    icon?: string;
    energyRequired?: string;
    emotionalTone?: string;
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
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]]/g, "\\$&");
        filters.$or = [
            { name: { $regex: sanitizedSearch, $options: "i" } },
            { description: { $regex: sanitizedSearch, $options: "i" } }
        ]
    }

    // Use lean for read-only queries (faster)
    const contexts = await Context.find(filters)
        .select("name description icon color cognitiveLoad emotionalTone energyRequired createdAt")
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
    const { name, description, color, icon, cognitiveLoad, emotionalTone, energyRequired, isDefault } = req.body as CreateContextReqBody;

    const user = req.user as UserDocument;

    const existingContext = await Context.findOne({
        name,
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
            // environmentNote,
            // musicSuggestion,
            isDefault,
        });

        const createdContext = await Context.findById(context._id)
            .select("_id name icon description cognitiveLoad energyRequired emotionalTone");

        if (!createdContext) {
            throw new ApiError({ statusCode: 500, message: "Problem while creating context" });
        }

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

    res.status(200)
        .json(new ApiResponse({
            statusCode: 200,
            message: "Context fetched successfully",
            data: context,
        }))
})

const updateContextById = asyncHandler(async (req, res) => {
    const { color, emotionalTone, icon, energyRequired, description } = req.body as UpdateContextReqBody;

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
        const updatedContext = await Context.findByIdAndUpdate(contextObjectId, {
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
        const deleteContext = await Context.findByIdAndUpdate(contextObjectId, {
            deletedAt: new Date(),
        }, { new: true })
            .populate("userId", "username email avatar");

        if (!deleteContext) {
            throw new ApiError({ statusCode: 500, message: "Problem while deleting context" });
        }

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