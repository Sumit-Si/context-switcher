import type { UserDocument } from "../types/common.types";
import type { TimeRange } from "../utils/analyticsEngine";
import { computeAnalytics } from "../utils/analyticsEngine";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/AsyncHandler";
import { AnalyticsService } from "../services/analytics.service";

const analyticsService = new AnalyticsService();

const getAnalytics = asyncHandler(async (req, res) => {
  try {
    const { timeRange = "week" } = req.query as { timeRange: TimeRange };
    const validRanges = ["day", "week", "month", "all"];
    const user = req.user as UserDocument;

    if (!validRanges.includes(timeRange)) {
      throw new ApiError({
        statusCode: 400,
        message: "Invalid timeRange. Use: day, week, month, all",
      });
    }

    const data = await computeAnalytics({ userId: user._id, timeRange });

    return res.status(200).json(
      new ApiResponse({
        statusCode: 200,
        data,
        message: "Analytics computed successfully",
      }),
    );
  } catch (_error) {
    throw new ApiError({
      statusCode: 500,
      message: "Problem while computing analytics",
    });
  }
});

const getSummary = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getSummary(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Summary statistics fetched successfully",
      data,
    }),
  );
});

const getHeatmap = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getHeatmap(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Heatmap data fetched successfully",
      data,
    }),
  );
});

const getTopContexts = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getTopContexts(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Top contexts fetched successfully",
      data,
    }),
  );
});

const getAvgFocusByContext = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getAvgFocusByContext(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Average focus by context fetched successfully",
      data,
    }),
  );
});

const getSwitchPatterns = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getSwitchPatterns(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Switch patterns fetched successfully",
      data,
    }),
  );
});

const getStreak = asyncHandler(async (req, res) => {
  const user = req.user as UserDocument;

  const data = await analyticsService.getStreak(user._id.toString());

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Streak data fetched successfully",
      data,
    }),
  );
});

export {
  getAnalytics,
  getSummary,
  getHeatmap,
  getTopContexts,
  getAvgFocusByContext,
  getSwitchPatterns,
  getStreak,
};
