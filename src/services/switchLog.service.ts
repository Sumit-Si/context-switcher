import { Types } from 'mongoose';
import type { SwitchLogSchemaProps } from '../models/switchLog.model';
import SwitchLog from '../models/switchLog.model';
import type { PaginatedResult, PaginationOptions } from './base.service';
import { BaseService } from './base.service';
import { ApiError } from '../utils/ApiError';
import Context from '../models/context.model';

export interface CreateSwitchLogDTO {
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

export interface UpdateSwitchLogDTO {
    focusQuality?: number;
    distraction?: string;
    notes?: string;
    projectTag?: string;
}

export interface ISwitchLogService {
    getAll(userId: string, options: PaginationOptions): Promise<PaginatedResult<SwitchLogSchemaProps>>;
    getById(id: string, userId: string): Promise<SwitchLogSchemaProps>;
    getActiveSession(userId: string): Promise<SwitchLogSchemaProps | null>;
    create(data: CreateSwitchLogDTO, userId: string): Promise<SwitchLogSchemaProps>;
    update(id: string, data: UpdateSwitchLogDTO, userId: string): Promise<SwitchLogSchemaProps>;
    endSession(id: string, userId: string): Promise<SwitchLogSchemaProps>;
    delete(id: string, userId: string): Promise<void>;
}

export class SwitchLogService extends BaseService<SwitchLogSchemaProps> implements ISwitchLogService {
    constructor() {
        super(SwitchLog);
    }

    /**
     * Validate that a context belongs to the user
     * @param contextId - Context ID to validate
     * @param userId - User ID to check ownership
     * @throws ApiError with 400 if context doesn't belong to user or doesn't exist
     */
    private async validateContextOwnership(
        contextId: string,
        userId: string
    ): Promise<void> {
        const context = await Context.findOne({
            _id: new Types.ObjectId(contextId),
            userId: new Types.ObjectId(userId),
            deletedAt: null
        });

        if (!context) {
            throw new ApiError({
                statusCode: 400,
                message: 'Context does not belong to user or does not exist'
            });
        }
    }

    /**
     * Auto-close any active session for the user
     * Sets endTime and calculates duration for the active session
     * @param userId - User ID to check for active sessions
     */
    private async autoCloseActiveSession(userId: string): Promise<void> {
        const activeSession = await this.model.findOne({
            userId: new Types.ObjectId(userId),
            endTime: null,
            deletedAt: null
        });

        if (activeSession) {
            const now = new Date();
            const durationInMinutes = Math.floor(
                (now.getTime() - activeSession.startTime.getTime()) / (1000 * 60)
            );

            activeSession.endTime = now;
            activeSession.durationInMinutes = durationInMinutes;
            await activeSession.save();
        }
    }

    /**
     * Get the active session for a user (session with no endTime)
     * @param userId - User ID to filter by
     * @returns Active session or null if no active session
     */
    async getActiveSession(userId: string): Promise<SwitchLogSchemaProps | null> {
        const session = await this.model.findOne({
            userId: new Types.ObjectId(userId),
            endTime: null,
            deletedAt: null
        })
            .populate('fromContext', 'name color icon')
            .populate('toContext', 'name color icon')
            .lean();

        return session;
    }

    /**
     * Create a new switch log entry
     * Validates context ownership, rejects same context switches, and auto-closes active sessions
     * @param data - Switch log creation data
     * @param userId - User ID
     * @returns Created switch log document
     * @throws ApiError with 400 if contexts don't belong to user or fromContext equals toContext
     */
    async create(data: CreateSwitchLogDTO, userId: string): Promise<SwitchLogSchemaProps> {
        // Validate context ownership (Requirement 5.1)
        await this.validateContextOwnership(data.toContext, userId);

        if (data.fromContext) {
            await this.validateContextOwnership(data.fromContext, userId);
        }

        // Reject if fromContext === toContext (Requirement 5.3)
        if (data.fromContext && data.fromContext === data.toContext) {
            throw new ApiError({
                statusCode: 400,
                message: 'Cannot switch to the same context'
            });
        }

        // Auto-close active session (Requirement 5.2)
        await this.autoCloseActiveSession(userId);

        const switchLog = await this.model.create({
            ...data,
            userId: new Types.ObjectId(userId),
            fromContext: data.fromContext ? new Types.ObjectId(data.fromContext) : null,
            toContext: new Types.ObjectId(data.toContext),
            ritualId: data.ritualId ? new Types.ObjectId(data.ritualId) : null,
            startTime: new Date(),
            durationInMinutes: 0
        });

        return switchLog.toObject();
    }

    /**
     * End an active session by setting endTime and calculating duration
     * @param id - Switch log ID to end
     * @param userId - User ID to filter by
     * @returns Updated switch log document
     * @throws ApiError with 404 if switch log not found
     * @throws ApiError with 400 if session already ended
     */
    async endSession(id: string, userId: string): Promise<SwitchLogSchemaProps> {
        const session = await this.model.findOne({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
            deletedAt: null
        });

        if (!session) {
            throw new ApiError({
                statusCode: 404,
                message: 'Switch log not found'
            });
        }

        if (session.endTime) {
            throw new ApiError({
                statusCode: 400,
                message: 'Session already ended'
            });
        }

        const now = new Date();
        const durationInMinutes = Math.floor(
            (now.getTime() - session.startTime.getTime()) / (1000 * 60)
        );

        session.endTime = now;
        session.durationInMinutes = durationInMinutes;
        await session.save();

        return session.toObject();
    }

    /**
     * Update a switch log entry
     * Only allows updating focusQuality, distraction, notes, and projectTag
     * @param id - Switch log ID to update
     * @param data - Switch log update data
     * @param userId - User ID to filter by
     * @returns Updated switch log document
     * @throws ApiError with 404 if switch log not found
     */
    async update(
        id: string,
        data: UpdateSwitchLogDTO,
        userId: string
    ): Promise<SwitchLogSchemaProps> {
        const updated = await this.model.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                userId: new Types.ObjectId(userId),
                deletedAt: null
            },
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        ).lean();

        if (!updated) {
            throw new ApiError({
                statusCode: 404,
                message: 'Switch log not found'
            });
        }

        return updated;
    }

    /**
     * Get all switch logs for a user with pagination
     * Populates fromContext and toContext fields
     * @param userId - User ID to filter by
     * @param options - Pagination options (page, limit, sortBy, sortOrder)
     * @returns Paginated result with switch logs and pagination metadata
     */
    async getAll(
        userId: string,
        options: PaginationOptions
    ): Promise<PaginatedResult<SwitchLogSchemaProps>> {
        const { skip, limit, sort } = this.buildPaginationQuery(options);

        const query = { userId: new Types.ObjectId(userId), deletedAt: null };

        const [data, total] = await Promise.all([
            this.model.find(query)
                .sort(sort as any)
                .skip(skip)
                .limit(limit)
                .populate('fromContext', 'name color icon')
                .populate('toContext', 'name color icon')
                .lean(),
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
     * Get a single switch log by ID for a user
     * Populates fromContext and toContext fields
     * @param id - Switch log ID
     * @param userId - User ID to filter by
     * @returns Switch log document
     * @throws ApiError with 404 if switch log not found
     */
    async getById(id: string, userId: string): Promise<SwitchLogSchemaProps> {
        const switchLog = await this.model.findOne({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
            deletedAt: null
        })
            .populate('fromContext', 'name color icon')
            .populate('toContext', 'name color icon')
            .lean();

        if (!switchLog) {
            throw new ApiError({
                statusCode: 404,
                message: 'Switch log not found'
            });
        }

        return switchLog;
    }

    /**
     * Soft delete a switch log for a user
     * Sets deletedAt timestamp instead of removing from database
     * @param id - Switch log ID to delete
     * @param userId - User ID to filter by
     * @throws ApiError with 404 if switch log not found
     */
    async delete(id: string, userId: string): Promise<void> {
        await this.softDelete(id, userId);
    }
}
