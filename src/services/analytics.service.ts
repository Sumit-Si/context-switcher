import { Types } from "mongoose";
import SwitchLog from "../models/switchLog.model";
import { formatTimezoneOffset } from "../utils/timezone";

// Aggregate result types for MongoDB pipelines
interface SwitchStatsResult {
  totalSwitches: number;
  avgFocusQuality: number;
  totalFocusMinutes: number;
  ritualsCompleted: number;
  ritualsTotal: number;
}

interface ContextUsageResult {
  contextId: string;
  contextName: string;
  totalTimeMinutes: number;
  switchCount: number;
  avgFocus: number;
}

interface FocusByContextResult {
  contextId: string;
  contextName: string;
  avgFocus: number;
}

interface StreakDayResult {
  _id: string;
}
import type { AnalyticsRequestParams } from "../utils/analyticsEngine";
import { computeAnalytics } from "../utils/analyticsEngine";

export interface DailySummary {
  totalSwitches: number;
  avgFocusQuality: number;
  ritualCompletionRate: number;
  totalFocusMinutes: number;
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
  avgFocus: number;
}

export interface SwitchPattern {
  fromContext: string;
  toContext: string;
  count: number;
  avgFocus: number;
}

export class AnalyticsService {
  /**
   * Comprehensive analytics including insights, trends, and performance metrics.
   * Offloads complex calculations from the frontend.
   */
  getFullAnalytics(params: AnalyticsRequestParams) {
    return computeAnalytics(params);
  }

  /**
   * Get summary statistics for today, this week, and this month
   * @param userId - User ID to filter by
   * @returns Period summary with today, thisWeek, and thisMonth statistics
   */
  async getSummary(userId: string): Promise<PeriodSummary> {
    const now = new Date();

    // Start of today in UTC
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

    const [today, thisWeek, thisMonth] = await Promise.all([
      this.calculateSummary(userId, startOfToday),
      this.calculateSummary(userId, startOfWeek),
      this.calculateSummary(userId, startOfMonth),
    ]);

    return { today, thisWeek, thisMonth };
  }

  /**
   * Calculate summary statistics for a given time period
   */
  private async calculateSummary(
    userId: string,
    startDate: Date,
  ): Promise<DailySummary> {
    const userIdObj = new Types.ObjectId(userId);

    const switchStats = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          startTime: { $gte: startDate },
          deletedAt: null,
          endTime: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalSwitches: { $sum: 1 },
          avgFocusQuality: { $avg: "$focusQuality" },
          totalFocusMinutes: { $sum: "$durationInMinutes" },
          ritualsCompleted: {
            $sum: { $cond: ["$ritualCompleted", 1, 0] },
          },
          ritualsTotal: {
            $sum: { $cond: [{ $ne: ["$ritualId", null] }, 1, 0] },
          },
        },
      },
    ]);

    if (switchStats.length === 0) {
      return {
        totalSwitches: 0,
        avgFocusQuality: 0,
        ritualCompletionRate: 0,
        totalFocusMinutes: 0,
      };
    }

    const stats = switchStats[0] as SwitchStatsResult;
    const ritualCompletionRate =
      stats.ritualsTotal > 0
        ? (stats.ritualsCompleted / stats.ritualsTotal) * 100
        : 0;

    return {
      totalSwitches: stats.totalSwitches,
      avgFocusQuality: Math.round((stats.avgFocusQuality || 0) * 10) / 10,
      ritualCompletionRate: Math.round(ritualCompletionRate * 10) / 10,
      totalFocusMinutes: stats.totalFocusMinutes || 0,
    };
  }

  /**
   * Get heatmap data showing switch counts by hour and day of week
   * Handles timezone offset to ensure the heatmap aligns with user's local time.
   */
  async getHeatmap(userId: string, timezoneOffset = 0): Promise<HeatmapData[]> {
    const userIdObj = new Types.ObjectId(userId);

    // Convert minutes to Mongo timezone format
    const timezone = formatTimezoneOffset(timezoneOffset);

    const heatmap = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          deletedAt: null,
        },
      },
      {
        $project: {
          hour: { $hour: { date: "$startTime", timezone } },
          dayOfWeek: { $dayOfWeek: { date: "$startTime", timezone } },
        },
      },
      {
        $group: {
          _id: {
            hour: "$hour",
            dayOfWeek: "$dayOfWeek",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          hour: "$_id.hour",
          dayOfWeek: "$_id.dayOfWeek",
          count: 1,
        },
      },
      {
        $sort: { dayOfWeek: 1, hour: 1 },
      },
    ]);

    return heatmap as HeatmapData[];
  }

  /**
   * Get top contexts with focus performance
   */
  async getTopContexts(
    userId: string,
  ): Promise<{ mostUsed: ContextUsage[]; leastUsed: ContextUsage[] }> {
    const userIdObj = new Types.ObjectId(userId);

    const contextStats = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          deletedAt: null,
          endTime: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$toContext",
          totalTimeMinutes: { $sum: "$durationInMinutes" },
          switchCount: { $sum: 1 },
          avgFocus: { $avg: "$focusQuality" },
        },
      },
      {
        $lookup: {
          from: "contexts",
          localField: "_id",
          foreignField: "_id",
          as: "context",
        },
      },
      {
        $unwind: "$context",
      },
      {
        $project: {
          contextId: { $toString: "$_id" },
          contextName: "$context.name",
          totalTimeMinutes: 1,
          switchCount: 1,
          avgFocus: { $round: ["$avgFocus", 1] },
        },
      },
      {
        $sort: { totalTimeMinutes: -1 },
      },
    ]);

    const mostUsed = (contextStats as ContextUsageResult[]).slice(0, 5);
    const leastUsed = (contextStats as ContextUsageResult[])
      .slice(-5)
      .reverse();

    return { mostUsed, leastUsed };
  }

  /**
   * Get average focus quality by context
   */
  async getAvgFocusByContext(
    userId: string,
  ): Promise<
    Array<{ contextId: string; contextName: string; avgFocus: number }>
  > {
    const userIdObj = new Types.ObjectId(userId);

    const focusStats = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          deletedAt: null,
          focusQuality: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$toContext",
          avgFocus: { $avg: "$focusQuality" },
        },
      },
      {
        $lookup: {
          from: "contexts",
          localField: "_id",
          foreignField: "_id",
          as: "context",
        },
      },
      {
        $unwind: "$context",
      },
      {
        $project: {
          contextId: { $toString: "$_id" },
          contextName: "$context.name",
          avgFocus: { $round: ["$avgFocus", 1] },
        },
      },
      {
        $sort: { avgFocus: -1 },
      },
    ]);

    return focusStats as FocusByContextResult[];
  }

  /**
   * Get switch patterns with impact on focus
   */
  async getSwitchPatterns(userId: string): Promise<SwitchPattern[]> {
    const userIdObj = new Types.ObjectId(userId);

    const patterns = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          fromContext: { $ne: null },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            from: "$fromContext",
            to: "$toContext",
          },
          count: { $sum: 1 },
          avgFocus: { $avg: "$focusQuality" },
        },
      },
      {
        $lookup: {
          from: "contexts",
          localField: "_id.from",
          foreignField: "_id",
          as: "fromCtx",
        },
      },
      {
        $lookup: {
          from: "contexts",
          localField: "_id.to",
          foreignField: "_id",
          as: "toCtx",
        },
      },
      {
        $unwind: "$fromCtx",
      },
      {
        $unwind: "$toCtx",
      },
      {
        $project: {
          fromContext: "$fromCtx.name",
          toContext: "$toCtx.name",
          count: 1,
          avgFocus: { $round: ["$avgFocus", 1] },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return patterns as SwitchPattern[];
  }

  /**
   * Get current and longest streak of ritual completions
   */
  async getStreak(
    userId: string,
    timezoneOffset = 0,
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    const userIdObj = new Types.ObjectId(userId);

    const completedDays = await SwitchLog.aggregate([
      {
        $match: {
          userId: userIdObj,
          ritualCompleted: true,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startTime",
              timezone: formatTimezoneOffset(timezoneOffset),
            },
          },
        },
      },
      { $sort: { _id: -1 } }, // Newest first
    ]);

    if (completedDays.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    const dates = (completedDays as StreakDayResult[]).map(
      (d) => new Date(d._id),
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check if streak is active (did ritual today or yesterday)
    const latestDate = dates[0];
    latestDate.setUTCHours(0, 0, 0, 0);

    const isStreakActive = latestDate >= yesterday;

    // Calculate all-time longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = Math.round(
          (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    if (isStreakActive) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = Math.round(
          (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, longestStreak };
  }
}
