import { Types } from 'mongoose';
import Context, { ContextSchemaProps } from '../models/context.model';
import { BaseService, PaginatedResult, PaginationOptions } from './base.service';
import { ApiError } from '../utils/ApiError';

export interface CreateContextDTO {
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

export interface UpdateContextDTO extends Partial<CreateContextDTO> { }

export interface IContextService {
    getAll(userId: string, options: PaginationOptions): Promise<PaginatedResult<ContextSchemaProps>>;
    getById(id: string, userId: string): Promise<ContextSchemaProps>;
    create(data: CreateContextDTO, userId: string): Promise<ContextSchemaProps>;
    update(id: string, data: UpdateContextDTO, userId: string): Promise<ContextSchemaProps>;
    delete(id: string, userId: string): Promise<void>;
    checkDuplicate(name: string, userId: string, excludeId?: string): Promise<boolean>;
}

export class ContextService extends BaseService<ContextSchemaProps> implements IContextService {
    constructor() {
        super(Context);
    }

    /**
     * Check if a context with the given name already exists for the user
     * Filters by userId and excludes soft-deleted records
     * @param name - Context name to check
     * @param userId - User ID to filter by
     * @param excludeId - Optional context ID to exclude from the check (for updates)
     * @returns true if duplicate exists, false otherwise
     */
    async checkDuplicate(
        name: string,
        userId: string,
        excludeId?: string
    ): Promise<boolean> {
        const query: any = {
            name,
            userId: new Types.ObjectId(userId),
            deletedAt: null
        };

        if (excludeId) {
            query._id = { $ne: new Types.ObjectId(excludeId) };
        }

        const existing = await this.model.findOne(query).select('_id');
        return !!existing;
    }

    /**
     * Get all contexts for a user with pagination
     * Filters by userId and excludes soft-deleted records
     * @param userId - User ID to filter by
     * @param options - Pagination options (page, limit, sortBy, sortOrder)
     * @returns Paginated result with contexts and pagination metadata
     */
    async getAll(
        userId: string,
        options: PaginationOptions
    ): Promise<PaginatedResult<ContextSchemaProps>> {
        const { skip, limit, sort } = this.buildPaginationQuery(options);

        const query = { userId: new Types.ObjectId(userId), deletedAt: null };

        const [data, total] = await Promise.all([
            this.model.find(query).sort(sort as any).skip(skip).limit(limit).lean(),
            this.model.countDocuments(query)
        ]);

        return {
            data,
            pagination: {
                total,
                page: options.page,
                limit: options.limit,
                totalPages: Math.ceil(total / options.limit)
            }
        };
    }

    /**
     * Get a single context by ID for a user
     * Filters by userId and excludes soft-deleted records
     * @param id - Context ID
     * @param userId - User ID to filter by
     * @returns Context document
     * @throws ApiError with 404 if context not found
     */
    async getById(id: string, userId: string): Promise<ContextSchemaProps> {
        const context = await this.findById(id, userId);

        if (!context) {
            throw new ApiError({
                statusCode: 404,
                message: 'Context not found'
            });
        }

        return context;
    }

    /**
     * Create a new context for a user
     * Checks for duplicate names within the user's contexts
     * @param data - Context creation data
     * @param userId - User ID
     * @returns Created context document
     * @throws ApiError with 409 if duplicate name exists
     */
    async create(data: CreateContextDTO, userId: string): Promise<ContextSchemaProps> {
        // Check for duplicate name within user's contexts (Requirement 7.1)
        const isDuplicate = await this.checkDuplicate(data.name, userId);
        if (isDuplicate) {
            throw new ApiError({
                statusCode: 409,
                message: 'Context with this name already exists'
            });
        }

        const context = await this.model.create({
            ...data,
            userId: new Types.ObjectId(userId)
        });

        return context.toObject();
    }

    /**
     * Update an existing context for a user
     * Checks for duplicate names within the user's contexts (excluding current context)
     * @param id - Context ID to update
     * @param data - Context update data
     * @param userId - User ID to filter by
     * @returns Updated context document
     * @throws ApiError with 404 if context not found
     * @throws ApiError with 409 if duplicate name exists
     */
    async update(
        id: string,
        data: UpdateContextDTO,
        userId: string
    ): Promise<ContextSchemaProps> {
        // Check if context exists and belongs to user
        await this.getById(id, userId);

        // Check for duplicate name if name is being updated (Requirement 7.2)
        if (data.name) {
            const isDuplicate = await this.checkDuplicate(data.name, userId, id);
            if (isDuplicate) {
                throw new ApiError({
                    statusCode: 409,
                    message: 'Context with this name already exists'
                });
            }
        }

        const updatedContext = await this.model.findOneAndUpdate(
            { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), deletedAt: null },
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedContext) {
            throw new ApiError({
                statusCode: 404,
                message: 'Context not found'
            });
        }

        return updatedContext;
    }

    /**
     * Soft delete a context for a user
     * Sets deletedAt timestamp instead of removing from database
     * @param id - Context ID to delete
     * @param userId - User ID to filter by
     * @throws ApiError with 404 if context not found
     */
    async delete(id: string, userId: string): Promise<void> {
        await this.softDelete(id, userId);
    }
}
