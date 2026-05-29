import type { UserDocument } from "../types/common.types";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import logger from "../config/logger";
import { ContextService } from "../services/context.service";

const contextService = new ContextService();

interface CreateContextReqBody {
  name: string;
  description?: string;
  color?: string;
  icon: string;
  cognitiveLoad?: string;
  emotionalTone?: string;
  energyRequired?: string;
  musicSuggestion?: string;
  environmentNote?: string;
}

interface UpdateContextReqBody {
  name?: string;
  color?: string;
  description?: string;
  icon?: string;
  energyRequired?: string;
  emotionalTone?: string;
  cognitiveLoad?: string;
}

const getAllContexts = asyncHandler(async (req, res) => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const user = req.user as UserDocument;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 50);

  const result = await contextService.getAll(user._id.toString(), {
    page: pageNum,
    limit: limitNum,
    sortBy: sortBy as string,
    sortOrder: order === "asc" ? "asc" : "desc",
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Contexts fetched successfully",
      data: {
        contexts: result.data,
        metadata: {
          totalPages: result.pagination.totalPages,
          currentPage: result.pagination.page,
          currentLimit: result.pagination.limit,
          totalContexts: result.pagination.total,
        },
      },
    }),
  );
});

const createContext = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    color,
    icon,
    cognitiveLoad,
    emotionalTone,
    energyRequired,
    musicSuggestion,
    environmentNote,
  } = req.body as CreateContextReqBody;

  const user = req.user as UserDocument;

  const context = await contextService.create(
    {
      name,
      description,
      color,
      icon,
      cognitiveLoad,
      emotionalTone,
      energyRequired,
      musicSuggestion,
      environmentNote,
    },
    user._id.toString(),
  );

  logger.info("Context created", {
    meta: {
      userId: user._id.toString(),
      contextId: (context as any)._id?.toString() || "unknown",
      name: context.name,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(201).json(
    new ApiResponse({
      statusCode: 201,
      message: "Context created successfully",
      data: context,
    }),
  );
});

const getContextById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  const context = await contextService.getById(id, user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Context fetched successfully",
      data: context,
    }),
  );
});

const updateContextById = asyncHandler(async (req, res) => {
  const {
    name,
    color,
    emotionalTone,
    icon,
    energyRequired,
    description,
    cognitiveLoad,
  } = req.body as UpdateContextReqBody;

  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  const updatedContext = await contextService.update(
    id,
    {
      name,
      color,
      emotionalTone,
      icon,
      energyRequired,
      description,
      cognitiveLoad,
    },
    user._id.toString(),
  );

  logger.info("Context updated", {
    meta: {
      userId: user._id.toString(),
      contextId: id,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Context updated successfully",
      data: updatedContext,
    }),
  );
});

const deleteContextById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const user = req.user as UserDocument;

  await contextService.delete(id, user._id.toString());

  logger.info("Context deleted (soft)", {
    meta: {
      userId: user._id.toString(),
      contextId: id,
      requestId: req.headers["x-request-id"],
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Context deleted successfully",
      data: null,
    }),
  );
});

export {
  getAllContexts,
  createContext,
  getContextById,
  updateContextById,
  deleteContextById,
};
