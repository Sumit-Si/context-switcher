import { Types } from 'mongoose';
import SwitchLog from '../models/switchLog.model';

export interface DailySummary {
    totalSwitches: number;
    avgFocusQuality: number;
    ritualCompletionRate: number;
}

export interface PeriodSummary {
    today: DailySummary;
    thisWeek: DailySummary;
    thisMonth: DailySummary;
}

export interface HeatmapData {
    hour: number;
    dayOfWeek: number;
    count: number;
}

export interface ContextUsage {
    contextId: string;
    contextName: string;
    totalTimeMinutes: number;
    switchCount: number;
}

export interface SwitchPattern {
    fromContext: string;
    toContext: string;
    count: number;
}

export class AnalyticsService {
    /**
     * Get summary statistics for today, this week, and this month
     * @param userId - User ID to filter by
     * @returns Period summary with today, thisWeek, and thisMonth statistics
     */
    async getSummary(userId: string): Promise<PeriodSummary> {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [today, thisWeek, thisMonth] = await Promise.all([
            this.calculateSummary(userId, startOfToday),
            this.calculateSummary(userId, startOfWeek),
            this.calculateSummary(userId, startOfMonth)
        ]);

        return { today, thisWeek, thisMonth };
    }

    /**
     * Calculate summary statistics for a given time period
     * @param userId - User ID to filter by
     * @param startDate - Start date for the period
     * @returns Daily summary with total switches, avg focus quality, and ritual completion rate
     */
    private async calculateSummary(userId: string, startDate: Date): Promise<DailySummary> {
        const userIdObj = new Types.ObjectId(userId);

        const switchStats = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    startTime: { $gte: startDate },
                    deletedAt: null
                }
            },
            {
                $group: {
                    _id: null,
                    totalSwitches: { $sum: 1 },
                    avgFocusQuality: { $avg: '$focusQuality' },
                    ritualsCompleted: {
                        $sum: { $cond: ['$ritualCompleted', 1, 0] }
                    },
                    ritualsTotal: {
                        $sum: { $cond: [{ $ne: ['$ritualId', null] }, 1, 0] }
                    }
                }
            }
        ]);

        if (switchStats.length === 0) {
            return {
                totalSwitches: 0,
                avgFocusQuality: 0,
                ritualCompletionRate: 0
            };
        }

        const stats = switchStats[0];
        const ritualCompletionRate = stats.ritualsTotal > 0
            ? (stats.ritualsCompleted / stats.ritualsTotal) * 100
            : 0;

        return {
            totalSwitches: stats.totalSwitches,
            avgFocusQuality: Math.round((stats.avgFocusQuality || 0) * 10) / 10,
            ritualCompletionRate: Math.round(ritualCompletionRate * 10) / 10
        };
    }

    /**
     * Get heatmap data showing switch counts by hour and day of week
     * @param userId - User ID to filter by
     * @returns Array of heatmap data with hour, dayOfWeek, and count
     */
    async getHeatmap(userId: string): Promise<HeatmapData[]> {
        const userIdObj = new Types.ObjectId(userId);

        const heatmap = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    deletedAt: null
                }
            },
            {
                $project: {
                    hour: { $hour: '$startTime' },
                    dayOfWeek: { $dayOfWeek: '$startTime' }
                }
            },
            {
                $group: {
                    _id: {
                        hour: '$hour',
                        dayOfWeek: '$dayOfWeek'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    hour: '$_id.hour',
                    dayOfWeek: '$_id.dayOfWeek',
                    count: 1
                }
            },
            {
                $sort: { dayOfWeek: 1, hour: 1 }
            }
        ]);

        return heatmap;
    }

    /**
     * Get top 5 most used and least used contexts
     * @param userId - User ID to filter by
     * @returns Object with mostUsed and leastUsed context arrays
     */
    async getTopContexts(userId: string): Promise<{ mostUsed: ContextUsage[]; leastUsed: ContextUsage[] }> {
        const userIdObj = new Types.ObjectId(userId);

        const contextStats = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    deletedAt: null,
                    endTime: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$toContext',
                    totalTimeMinutes: { $sum: '$durationInMinutes' },
                    switchCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'contexts',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'context'
                }
            },
            {
                $unwind: '$context'
            },
            {
                $project: {
                    contextId: { $toString: '$_id' },
                    contextName: '$context.name',
                    totalTimeMinutes: 1,
                    switchCount: 1
                }
            },
            {
                $sort: { totalTimeMinutes: -1 }
            }
        ]);

        const mostUsed = contextStats.slice(0, 5);
        const leastUsed = contextStats.slice(-5).reverse();

        return { mostUsed, leastUsed };
    }

    /**
     * Get average focus quality by context
     * @param userId - User ID to filter by
     * @returns Array of contexts with their average focus quality
     */
    async getAvgFocusByContext(userId: string): Promise<Array<{ contextId: string; contextName: string; avgFocus: number }>> {
        const userIdObj = new Types.ObjectId(userId);

        const focusStats = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    deletedAt: null,
                    focusQuality: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$toContext',
                    avgFocus: { $avg: '$focusQuality' }
                }
            },
            {
                $lookup: {
                    from: 'contexts',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'context'
                }
            },
            {
                $unwind: '$context'
            },
            {
                $project: {
                    contextId: { $toString: '$_id' },
                    contextName: '$context.name',
                    avgFocus: { $round: ['$avgFocus', 1] }
                }
            },
            {
                $sort: { avgFocus: -1 }
            }
        ]);

        return focusStats;
    }

    /**
     * Get top 10 switch patterns (from context -> to context transitions)
     * @param userId - User ID to filter by
     * @returns Array of switch patterns with count
     */
    async getSwitchPatterns(userId: string): Promise<SwitchPattern[]> {
        const userIdObj = new Types.ObjectId(userId);

        const patterns = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    fromContext: { $ne: null },
                    deletedAt: null
                }
            },
            {
                $group: {
                    _id: {
                        from: '$fromContext',
                        to: '$toContext'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'contexts',
                    localField: '_id.from',
                    foreignField: '_id',
                    as: 'fromCtx'
                }
            },
            {
                $lookup: {
                    from: 'contexts',
                    localField: '_id.to',
                    foreignField: '_id',
                    as: 'toCtx'
                }
            },
            {
                $unwind: '$fromCtx'
            },
            {
                $unwind: '$toCtx'
            },
            {
                $project: {
                    fromContext: '$fromCtx.name',
                    toContext: '$toCtx.name',
                    count: 1
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]);

        return patterns;
    }

    /**
     * Get current and longest ritual completion streak
     * @param userId - User ID to filter by
     * @returns Object with currentStreak and longestStreak
     */
    async getStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
        const userIdObj = new Types.ObjectId(userId);

        // Get all days with completed rituals
        const completedDays = await SwitchLog.aggregate([
            {
                $match: {
                    userId: userIdObj,
                    ritualCompleted: true,
                    deletedAt: null
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$startTime' },
                        month: { $month: '$startTime' },
                        day: { $dayOfMonth: '$startTime' }
                    }
                }
            },
            {
                $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
            }
        ]);

        if (completedDays.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }

        // Calculate streaks
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < completedDays.length; i++) {
            const day = completedDays[i]._id;
            const date = new Date(day.year, day.month - 1, day.day);

            if (i === 0) {
                const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) {
                    currentStreak = 1;
                }
            }

            if (i > 0) {
                const prevDay = completedDays[i - 1]._id;
                const prevDate = new Date(prevDay.year, prevDay.month - 1, prevDay.day);
                const diffDays = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    tempStreak++;
                    if (i === 1 && currentStreak > 0) {
                        currentStreak = tempStreak;
                    }
                } else {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

        return { currentStreak, longestStreak };
    }
}
