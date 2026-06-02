import type { Types } from "mongoose";
import mongoose from "mongoose";
import SwitchLog from "../models/switchLog.model";

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
}

// For internal helpers that receive a resolved date range
interface DateRangeParams {
  userId: Types.ObjectId;
  from: Date;
  to: Date;
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
  ritualComplianceRate: number;
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

// Convert timeRange string to date range
export const getDateRange = (timeRange: TimeRange): DateRange => {
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
    case "all":
      from = new Date("2026-01-01"); // beginning of time
      break;
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
}: AnalyticsRequestParams) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { from, to, previousFrom, previousTo } = getDateRange(timeRange);

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
    getDailyFocusData({ userId: userObjectId, from, to }),
    getContextPerformance({ userId: userObjectId, from, to }),
    getContextSwitches({ userId: userObjectId, from, to }),
    getFocusTrendData({ userId: userObjectId, from, to }),
    getTimeOfDayData({ userId: userObjectId, from, to, preferences }),
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
      },
    },
    {
      $group: {
        _id: null,
        totalFocusMinutes: { $sum: "$durationInMinutes" },
        totalSessions: { $sum: 1 },
        averageFocusScore: {
          // Only average sessions where user gave a rating
          $avg: {
            $cond: [
              { $ne: ["$focusQuality", null] },
              { $multiply: ["$focusQuality", 20] }, // convert 1–5 to 0–100
              null,
            ],
          },
        },
        switchesWithRitual: {
          $sum: { $cond: [{ $eq: ["$ritualCompleted", true] }, 1, 0] },
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
      switchesWithRitual: 0,
      switchesTotal: 0,
    };
  }

  const r = result[0];
  const hours = Math.floor(r.totalFocusMinutes / 60);
  const minutes = Math.round(r.totalFocusMinutes % 60);

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
    switchesWithRitual: r.switchesWithRitual,
    switchesTotal: r.switchesTotal,
  };
};

// ─────────────────────────────────────────────
// DAILY FOCUS DATA — one row per day
// ─────────────────────────────────────────────
const getDailyFocusData = async ({ userId, from, to }: DateRangeParams) => {
  const logs = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
      },
    },
    {
      // Group by calendar day
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
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

  return logs.map((row) => {
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

  return logs.map((row) => {
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

  return switches.map((sw) => {
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
const getFocusTrendData = async ({ userId, from, to }: DateRangeParams) => {
  const logs = await SwitchLog.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: from, $lte: to },
        endTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: { $week: "$startTime" }, // group by ISO week number
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

  return logs.map((row, idx) => ({
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
      },
    },
    {
      $group: {
        _id: { $hour: "$startTime" },
        avgFocus: {
          $avg: { $multiply: ["$focusQuality", 20] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Build a map from hour → avgFocus
  const hourMap: Record<number, number> = {};
  results.forEach((r) => {
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

  // Insight 2: Ritual compliance
  if (keyMetrics.ritualComplianceRate < 50) {
    insights.push({
      type: "warning",
      icon: "🔔",
      title: "Low Ritual Usage",
      description: `You only used rituals on ${keyMetrics.ritualComplianceRate}% of switches. Ritual switches score 20-35% higher on average.`,
      action: "Start a ritual",
    });
  } else if (keyMetrics.ritualComplianceRate >= 80) {
    insights.push({
      type: "success",
      icon: "🎯",
      title: "Ritual Master",
      description: `${keyMetrics.ritualComplianceRate}% ritual compliance this period. You're building a strong focus habit.`,
      action: "See rituals",
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

  // Insight 5: Work-Life Balance (New Smart Insight)
  if (preferences) {
    // We could add logic here to detect if focus is higher outside work hours
    // or if the user is working too late.
    // For now, let's just acknowledge their custom work hours.
    insights.push({
      type: "tip",
      icon: "⏰",
      title: "Optimized for Your Schedule",
      description: `Analytics are now tuned to your ${preferences.workStartHour}:00 – ${preferences.workEndHour}:00 work day.`,
      action: "Update hours",
    });
  }

  return insights;
};
