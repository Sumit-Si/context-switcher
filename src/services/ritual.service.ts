import { Types } from "mongoose";
import type { RitualSchemaProps } from "../models/ritual.model";
import Ritual from "../models/ritual.model";
import type { PaginatedResult, PaginationOptions } from "./base.service";
import { BaseService } from "./base.service";
import { ApiError } from "../utils/ApiError";

export interface CreateRitualDTO {
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

export type UpdateRitualDTO = Partial<CreateRitualDTO>;

export interface IRitualService {
  getAll(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<RitualSchemaProps>>;
  getById(id: string, userId: string): Promise<RitualSchemaProps>;
  create(data: CreateRitualDTO, userId: string): Promise<RitualSchemaProps>;
  update(
    id: string,
    data: UpdateRitualDTO,
    userId: string,
  ): Promise<RitualSchemaProps>;
  delete(id: string, userId: string): Promise<void>;
}

export class RitualService
  extends BaseService<RitualSchemaProps>
  implements IRitualService
{
  constructor() {
    super(Ritual);
  }

  /**
   * Get all rituals for a user with pagination
   * Filters by userId and excludes soft-deleted records
   * @param userId - User ID to filter by
   * @param options - Pagination options (page, limit, sortBy, sortOrder)
   * @returns Paginated result with rituals and pagination metadata
   */
  async getAll(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<RitualSchemaProps>> {
    const { skip, limit, sort } = this.buildPaginationQuery(options);

    const query = { userId: new Types.ObjectId(userId), deletedAt: null };

    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  /**
   * Get a single ritual by ID for a user
   * Filters by userId and excludes soft-deleted records
   * @param id - Ritual ID
   * @param userId - User ID to filter by
   * @returns Ritual document
   * @throws ApiError with 404 if ritual not found
   */
  async getById(id: string, userId: string): Promise<RitualSchemaProps> {
    const ritual = await this.findById(id, userId);

    if (!ritual) {
      throw new ApiError({
        statusCode: 404,
        message: "Ritual not found",
      });
    }

    return ritual;
  }

  /**
   * Create a new ritual for a user
   * @param data - Ritual creation data
   * @param userId - User ID
   * @returns Created ritual document
   */
  async create(
    data: CreateRitualDTO,
    userId: string,
  ): Promise<RitualSchemaProps> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ritualData: Record<string, any> = {
      ...data,
      userId: new Types.ObjectId(userId),
    };

    // Handle targetTransition - remove null values
    if (ritualData.targetTransition) {
      ritualData.targetTransition = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        fromContext: ritualData.targetTransition.fromContext || undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        toContext: ritualData.targetTransition.toContext || undefined,
      };
    }

    let ritual;
    try {
      ritual = await this.model.create(ritualData);
    } catch (error: unknown) {
      // MongoDB duplicate key error (unique index on name + userId)
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ApiError({
          statusCode: 409,
          message: "A ritual with this name already exists",
        });
      }
      throw error;
    }

    return ritual.toObject();
  }

  /**
   * Update an existing ritual for a user
   * @param id - Ritual ID to update
   * @param data - Ritual update data
   * @param userId - User ID to filter by
   * @returns Updated ritual document
   * @throws ApiError with 404 if ritual not found
   */
  async update(
    id: string,
    data: UpdateRitualDTO,
    userId: string,
  ): Promise<RitualSchemaProps> {
    // Check if ritual exists and belongs to user
    await this.getById(id, userId);

    const updatedRitual = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: data },
        { returnDocument: "after", runValidators: true },
      )
      .lean();

    if (!updatedRitual) {
      throw new ApiError({
        statusCode: 404,
        message: "Ritual not found",
      });
    }

    return updatedRitual;
  }

  /**
   * Soft delete a ritual for a user
   * Sets deletedAt timestamp instead of removing from database
   * @param id - Ritual ID to delete
   * @param userId - User ID to filter by
   * @throws ApiError with 404 if ritual not found
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.softDelete(id, userId);
  }
}
