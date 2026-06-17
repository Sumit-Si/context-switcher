import type { Types } from "mongoose";
import mongoose from "mongoose";
import SwitchLog from "../models/switchLog.model";
import { formatTimezoneOffset } from "./timezone";

// Shared base types
export type TimeRange = "day" | "week" | "month" | "all";

export interface UserPreferences {
  workStartHour: number;
  workEndHour: number;
}

// For the public-facing entry point
export interface AnalyticsRequestParams {
  userId: Types.ObjectId;
  from?: Date | null;
  to?: Date | null;
  timeRange: TimeRange;
  preferences?: UserPreferences;
  timezoneOffset?: number; // in minutes, e.g., -330 for IST (UTC+5:30)
}

// For internal helpers that receive a resolved date range
interface DateRangeParams {
  userId: Types.ObjectId;
  from: Date;
  to: Date;
  timezoneOffset?: number;
}

interface DateRangeWithPrefsParams extends DateRangeParams {
  preferences?: UserPreferences;
}

// Return type of getDateRange
interface DateRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

interface Insight {
  type: "success" | "warning" | "info" | "tip";
  icon: string;
  title: string;
  description: string;
  action: string;
}

// Return type of getKeyMetrics
interface KeyMetrics {
  totalFocusTime: string;
  totalFocusMinutes: number;
  averageFocusScore: number;
  totalSessions: number;
  totalContextSwitches: number;
  ritualComplianceRate: number; // Percentage of ALL switches that had a ritual completed
  ritualSuccessRate: number; // Percentage of switches WITH rituals where ritual was completed
  ritualImpact: number; // Focus score difference between ritual vs non-ritual sessions
  switchesWithRitual: number;
  switchesTotal: number;
}

type Difficulty = "hard" | "medium" | "easy";

const DifficultyEnum = {
  Hard: "hard",
  Medium: "medium",
  Easy: "easy",
} as const;

interface ContextPerformanceRow {
  contextId: string;
  name: string;
  color: string;
  icon: string;
  avgFocus: number;
  sessions: number;
  totalTime: string;
  totalMinutes: number;
}

interface ContextSwitchRow {
  from: string;
  fromIcon: string;
  to: string;
  toIcon: string;
  count: number;
  avgFocus: number;
  difficulty: Difficulty;
}

// For generateInsights
interface InsightInput {
  keyMetrics: KeyMetrics;
  contextPerformance: ContextPerformanceRow[];
  contextSwitches: ContextSwitchRow[];
  focusScoreChange: number;
  preferences?: UserPreferences;
}

// ─── Aggregate result types ──────────────────────────────
// These describe the raw shape of MongoDB aggregate outputs

interface KeyMetricsAggResult {
  totalFocusMinutes: number;
  totalSessions: number;
  averageFocusScore: number;
  switchesWithRitual: number;
  switchesWithRitualAssigned: number;
  focusWithRitual: number;
  focusWithoutRitual: number;
  switchesTotal: number;
}

interface DailyFocusAggResult {
  _id: string;
  avgFocus: number;
  sessions: number;
  focusMinutes: number;
}

interface ContextPerfAggResult {
  _id: { toString(): string };
  avgFocusScore: number;
  sessions: number;
  totalMinutes: number;
  contextInfo: { name: string; color?: string; icon?: string };
}

interface ContextSwitchAggResult {
  _id: { from: unknown; to: unknown };
  count: number;
  avgFocus: number;
  fromCtx: { name: string; icon?: string };
  toCtx: { name: string; icon?: string };
}

interface FocusTrendAggResult {
  _id: number;
  avgFocus: number;
  sessions: number;
  minDate: { toISOString(): string };
}

interface TimeOfDayAggResult {
  _id: number;
  avgFocus: number;
  count: number;
}

// Convert timeRange string to date range
export const getDateRange = async (
  timeRange: TimeRange,
  userId: Types.ObjectId,
): Promise<DateRange> => {
  const now = new Date();
  const to = new Date(now);
  let from = new Date(now);

  switch (timeRange) {
    case "day":
      from.setHours(0, 0, 0, 0); // start of today
      break;
    case "week":
      from.setDate(now.getDate() - 7); // 7 days ago
      break;
    case "month":
      from.setMonth(now.getMonth() - 1); // 30 days ago
      break;
    case "all": {
      // Find the first log for this user
      const firstLog = await SwitchLog.findOne({
        userId,
        deletedAt: null,
      }).sort({ startTime: 1 });
      if (firstLog) {
        from = new Date(firstLog.startTime);
      } else {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
      }
      break;
    }
    default:
      from.setDate(now.getDate() - 7);
  }

  // Previous period (for comparison: "vs last week")
  const periodLength = to.getTime() - from.getTime();
  const previousTo = new Date(from);
  const previousFrom = new Date(from.getTime() - periodLength);

  return { from, to, previousFrom, previousTo };
};

// ─────────────────────────────────────────────
// MAIN: Compute all analytics for one user + timeRange
// ─────────────────────────────────────────────
export const computeAnalytics = async ({
  userId,
  timeRange,
  preferences,
  timezoneOffset = 0,
}: AnalyticsRequestParams) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { from, to, previousFrom, previousTo } = await getDateRange(
    timeRange,
    userObjectId,
  );

  // Run all aggregations in parallel for speed
  const [
    keyMetrics,
    previousMetrics,
    dailyFocusData,
    contextPerformance,
    contextSwitches,
    focusTrendData,
    timeOfDayData,
  ] = await Promise.all([
    getKeyMetrics({ userId: userObjectId, from, to }),
    getKeyMetrics({ userId: userObjectId, from: previousFrom, to: previousTo }), // for % change
    getDailyFocusData({ userId: userObjectId, from, to, timezoneOffset }),
    getContextPerformance({ userId: userObjectId, from, to }),
    getContextSwitches({ userId: userObjectId, from, to }),
    getFocusTrendData({ userId: userObjectId, from, to, timezoneOffset }),
    getTimeOfDayData({
      userId: userObjectId,
      from,
      to,
      preferences,
      timezoneOffset,
    }),
  ]);

  // Compute focus score change vs previous period
  const focusScoreChange = previousMetrics.averageFocusScore
    ? Math.round(
        keyMetrics.averageFocusScore - previousMetrics.averageFocusScore,
      )
    : 0;

  // Generate insights from computed data
  const insights = generateInsights({
    keyMetrics,
    contextPerformance,
    contextSwitches,
    focusScoreChange,
    preferences,
  });

  return {
    keyMetrics: { ...keyMetrics, focusScoreChange },
    dailyFocusData,
    contextPerformance,
    contextSwitches,
    focusTrendData,
    timeOfDayData,
    insights,
    period: {
      timeRange,
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
    },
  };
};

// ─────────────────────────────────────────────
// KEY METRICS — totals, averages, compliance
// ─────────────────────────────────────────────
const getKeyMetrics = async ({ userId, from, to }: DateRangeParams) => {
  const result = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null }, // only completed sessions
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalFocusMinutes: { $sum: "$durationInMinutes" },
        totalSessions: { $sum: 1 },
        averageFocusScore: {
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        switchesWithRitual: {
          $sum: { $cond: [{ $eq: ["$ritualCompleted", true] }, 1, 0] },
        },
        switchesWithRitualAssigned: {
          $sum: { $cond: [{ $ne: ["$ritualId", null] }, 1, 0] },
        },
        focusWithRitual: {
          $avg: {
            $cond: [
              { $eq: ["$ritualCompleted", true] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        focusWithoutRitual: {
          $avg: {
            $cond: [
              { $ne: ["$ritualCompleted", true] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        switchesTotal: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      totalFocusTime: "0h 0m",
      totalFocusMinutes: 0,
      averageFocusScore: 0,
      totalSessions: 0,
      totalContextSwitches: 0,
      ritualComplianceRate: 0,
      ritualSuccessRate: 0,
      ritualImpact: 0,
      switchesWithRitual: 0,
      switchesTotal: 0,
    };
  }

  const r = result[0] as KeyMetricsAggResult;
  const hours = Math.floor(r.totalFocusMinutes / 60);
  const minutes = Math.round(r.totalFocusMinutes % 60);

  const ritualImpact =
    r.focusWithRitual && r.focusWithoutRitual
      ? Math.round(r.focusWithRitual - r.focusWithoutRitual)
      : 0;

  return {
    totalFocusTime: `${hours}h ${minutes}m`,
    totalFocusMinutes: Math.round(r.totalFocusMinutes || 0),
    averageFocusScore: Math.round(r.averageFocusScore || 0),
    totalSessions: r.totalSessions,
    totalContextSwitches: r.switchesTotal,
    ritualComplianceRate:
      r.switchesTotal > 0
        ? Math.round((r.switchesWithRitual / r.switchesTotal) * 100)
        : 0,
    ritualSuccessRate:
      r.switchesWithRitualAssigned > 0
        ? Math.round(
            (r.switchesWithRitual / r.switchesWithRitualAssigned) * 100,
          )
        : 0,
    ritualImpact,
    switchesWithRitual: r.switchesWithRitual,
    switchesTotal: r.switchesTotal,
  };
};

// ─────────────────────────────────────────────
// DAILY FOCUS DATA — one row per day
// ─────────────────────────────────────────────
const getDailyFocusData = async ({
  userId,
  from,
  to,
  timezoneOffset = 0,
}: DateRangeParams) => {
  const logs = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
        deletedAt: null,
      },
    },
    {
      // Group by calendar day
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$startTime",
            timezone: formatTimezoneOffset(timezoneOffset),
          },
        },
        avgFocus: {
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        sessions: { $sum: 1 },
        focusMinutes: { $sum: "$durationInMinutes" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (logs as DailyFocusAggResult[]).map((row) => {
    const date = new Date(row._id);
    return {
      day: DAY_NAMES[date.getDay()],
      date: row._id,
      focus: Math.round(row.avgFocus || 0),
      sessions: row.sessions,
      focusMinutes: Math.round(row.focusMinutes || 0),
    };
  });
};

// ─────────────────────────────────────────────
// CONTEXT PERFORMANCE — per context aggregation
// ─────────────────────────────────────────────
const getContextPerformance = async ({ userId, from, to }: DateRangeParams) => {
  const logs = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$toContext",
        avgFocusScore: {
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        sessions: { $sum: 1 },
        totalMinutes: { $sum: "$durationInMinutes" },
      },
    },
    {
      // Join with Context collection to get name, icon, color
      $lookup: {
        from: "contexts",
        localField: "_id",
        foreignField: "_id",
        as: "contextInfo",
      },
    },
    { $unwind: "$contextInfo" },
    { $sort: { avgFocusScore: -1 } }, // best performing first
  ]);

  return (logs as ContextPerfAggResult[]).map((row) => {
    const hours = Math.floor(row.totalMinutes / 60);
    const mins = Math.round(row.totalMinutes % 60);
    return {
      contextId: row._id.toString(),
      name: row.contextInfo.name,
      color: row.contextInfo.color || "#2E86AB",
      icon: row.contextInfo.icon || "📋",
      avgFocus: Math.round(row.avgFocusScore || 0),
      sessions: row.sessions,
      totalTime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
      totalMinutes: Math.round(row.totalMinutes || 0),
    };
  });
};

// ─────────────────────────────────────────────
// CONTEXT SWITCHES — difficulty map
// ─────────────────────────────────────────────
const getContextSwitches = async ({ userId, from, to }: DateRangeParams) => {
  const switches = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        fromContext: { $ne: null },
        endTime: { $ne: null },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: { from: "$fromContext", to: "$toContext" },
        count: { $sum: 1 },
        avgFocus: {
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
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
    { $unwind: "$fromCtx" },
    { $unwind: "$toCtx" },
    { $sort: { avgFocus: 1 } }, // hardest (lowest focus) first
    { $limit: 10 }, // top 10 hardest transitions
  ]);

  return (switches as ContextSwitchAggResult[]).map((sw) => {
    const focus = Math.round(sw.avgFocus || 0);
    // Difficulty based on average focus score
    const difficulty: Difficulty =
      focus < 50 ? "hard" : focus < 70 ? "medium" : "easy";
    return {
      from: sw.fromCtx.name,
      fromIcon: sw.fromCtx.icon || "📋",
      to: sw.toCtx.name,
      toIcon: sw.toCtx.icon || "📋",
      count: sw.count,
      avgFocus: focus,
      difficulty,
    };
  });
};

// ─────────────────────────────────────────────
// FOCUS TREND DATA — weekly buckets for monthly view
// ─────────────────────────────────────────────
const getFocusTrendData = async ({
  userId,
  from,
  to,
  timezoneOffset = 0,
}: DateRangeParams) => {
  const logs = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          $week: {
            date: "$startTime",
            timezone: formatTimezoneOffset(timezoneOffset),
          },
        }, // group by ISO week number
        avgFocus: {
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] },
              null,
            ],
          },
        },
        sessions: { $sum: 1 },
        minDate: { $min: "$startTime" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return (logs as FocusTrendAggResult[]).map((row, idx) => ({
    week: `Week ${idx + 1}`,
    weekNumber: row._id,
    avgFocus: Math.round(row.avgFocus || 0),
    sessions: row.sessions,
    startDate: row.minDate.toISOString().split("T")[0],
  }));
};

// ─────────────────────────────────────────────
// TIME OF DAY DATA — hour buckets
// ─────────────────────────────────────────────
const getTimeOfDayData = async ({
  userId,
  from,
  to,
  preferences,
  timezoneOffset = 0,
}: DateRangeWithPrefsParams) => {
  const slots = [
    { label: "12am – 3am", start: 0, end: 3 },
    { label: "3am – 6am", start: 3, end: 6 },
    { label: "6am – 9am", start: 6, end: 9 },
    { label: "9am – 12pm", start: 9, end: 12 },
    { label: "12pm – 3pm", start: 12, end: 15 },
    { label: "3pm – 6pm", start: 15, end: 18 },
    { label: "6pm – 9pm", start: 18, end: 21 },
    { label: "9pm – 12am", start: 21, end: 24 },
  ];

  const results = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
        focusQuality: { $ne: null },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          $hour: {
            date: "$startTime",
            timezone: formatTimezoneOffset(timezoneOffset),
          },
        },
        avgFocus: {
          $avg: { $multiply: ["$focusQuality", 20] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Build a map from hour → avgFocus
  const hourMap: Record<number, number> = {};
  (results as TimeOfDayAggResult[]).forEach((r) => {
    hourMap[r._id] = Math.round(r.avgFocus);
  });

  const finalSlots = slots.map((slot) => {
    // Average all hours in this slot
    const hours = [];
    for (let h = slot.start; h < slot.end; h++) {
      if (hourMap[h] !== undefined) hours.push(hourMap[h]);
    }
    const focus =
      hours.length > 0
        ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
        : 0;

    // Determine if this slot is part of work hours
    let isWorkHour = false;
    if (preferences) {
      const { workStartHour, workEndHour } = preferences;
      // Overlap logic: [start, end) overlaps with [workStartHour, workEndHour)
      isWorkHour = slot.start < workEndHour && slot.end > workStartHour;
    }

    return {
      time: slot.label,
      focus,
      sessions: hours.length,
      isWorkHour,
    };
  });

  // Find the slot with max focus
  const maxFocus = Math.max(...finalSlots.map((s) => s.focus));

  return finalSlots.map((s) => ({
    ...s,
    optimal: maxFocus > 0 && s.focus === maxFocus,
  }));
};

// ─────────────────────────────────────────────
// INSIGHTS — auto-generated tips from the data
// ─────────────────────────────────────────────
const generateInsights = ({
  keyMetrics,
  contextPerformance,
  contextSwitches,
  focusScoreChange,
  preferences,
}: InsightInput) => {
  const insights: Insight[] = [];

  // Insight 1: Focus score trend
  if (focusScoreChange > 0) {
    insights.push({
      type: "success",
      icon: "📈",
      title: "Focus Improving",
      description: `Your average focus score went up ${focusScoreChange}% compared to last period. Keep using rituals.`,
      action: "View trend",
    });
  } else if (focusScoreChange < -5) {
    insights.push({
      type: "warning",
      icon: "⚠️",
      title: "Focus Dropping",
      description: `Your focus score dropped ${Math.abs(focusScoreChange)}% vs last period. Try adding a ritual to your hardest switch.`,
      action: "See rituals",
    });
  }

  // Insight 2: Ritual compliance & Impact
  if (keyMetrics.ritualImpact > 10) {
    insights.push({
      type: "success",
      icon: "🚀",
      title: "Rituals are Working",
      description: `Sessions with rituals score ${keyMetrics.ritualImpact}% higher than those without. You're ${keyMetrics.ritualSuccessRate}% consistent with assigned rituals.`,
      action: "See impact",
    });
  } else if (keyMetrics.ritualComplianceRate < 50) {
    insights.push({
      type: "warning",
      icon: "🔔",
      title: "Low Ritual Usage",
      description: `You only used rituals on ${keyMetrics.ritualComplianceRate}% of switches. Ritual switches score 20-35% higher on average.`,
      action: "Start a ritual",
    });
  }

  // Insight 3: Best context
  if (contextPerformance.length > 0) {
    const best = contextPerformance[0]; // already sorted by avgFocus desc
    insights.push({
      type: "info",
      icon: best.icon,
      title: `${best.name} is Your Best Context`,
      description: `You achieve ${best.avgFocus}% focus in ${best.name}. Try to schedule more time here.`,
      action: "Schedule more",
    });
  }

  // Insight 4: Hardest switch
  if (contextSwitches.length > 0) {
    const hardest = contextSwitches[0]; // sorted by avgFocus asc (lowest first)
    if (hardest.difficulty === DifficultyEnum.Hard) {
      insights.push({
        type: "tip",
        icon: "💡",
        title: "Hardest Transition Detected",
        description: `${hardest.from} → ${hardest.to} drops your focus to ${hardest.avgFocus}%. A 2-min breathing ritual before this switch would help.`,
        action: "Get ritual",
      });
    }
  }

  // Insight 5: Work-Life Balance
  if (preferences) {
    insights.push({
      type: "tip",
      icon: "⏰",
      title: "Optimized for Your Schedule",
      description: `Analytics are tuned to your ${preferences.workStartHour}:00 – ${preferences.workEndHour}:00 work day.`,
      action: "Update hours",
    });
  }

  return insights;
};
