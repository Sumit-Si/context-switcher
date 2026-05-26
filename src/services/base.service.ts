import { Model } from 'mongoose';
import { ApiError } from '../utils/ApiError';

export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export abstract class BaseService<T> {
    protected model: Model<T>;

    constructor(model: Model<T>) {
        this.model = model;
    }

    protected async findById(id: string, userId: string): Promise<T | null> {
        return this.model.findOne({
            _id: id,
            userId,
            deletedAt: null
        } as any).lean();
    }

    protected async softDelete(id: string, userId: string): Promise<void> {
        const result = await this.model.findOneAndUpdate(
            { _id: id, userId, deletedAt: null } as any,
            { deletedAt: new Date() } as any,
            { returnDocument: 'after' }
        );

        if (!result) {
            throw new ApiError({
                statusCode: 404,
                message: `${this.model.modelName} not found`
            });
        }
    }

    protected buildPaginationQuery(options: PaginationOptions) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        return { skip, limit, sort };
    }
}
