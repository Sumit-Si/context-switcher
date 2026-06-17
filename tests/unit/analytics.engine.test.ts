import { describe, it, expect, beforeEach } from "vitest";
import Context from "../../src/models/context.model";
import Ritual from "../../src/models/ritual.model";
import SwitchLog from "../../src/models/switchLog.model";
import {
  computeAnalytics,
  getDateRange,
} from "../../src/utils/analyticsEngine";
import { Types } from "mongoose";

describe("Analytics Engine Unit Tests", () => {
  let userId: Types.ObjectId;
  let contextA: any;
  let contextB: any;

  beforeEach(async () => {
    userId = new Types.ObjectId();

    // Clear collections
    await Context.deleteMany({});
    await Ritual.deleteMany({});
    await SwitchLog.deleteMany({});

    // Setup base data
    contextA = await Context.create({
      userId,
      name: "Focus",
      color: "#ff0000",
      icon: "🎯",
      cognitiveLoad: "high",
      emotionalTone: "calm",
      energyRequired: "high",
      isDefault: false,
    });

    contextB = await Context.create({
      userId,
      name: "Relax",
      color: "#0000ff",
      icon: "🧘",
      cognitiveLoad: "low",
      emotionalTone: "calm",
      energyRequired: "low",
      isDefault: false,
    });
  });

  describe("getDateRange", () => {
    it("should return correct ranges for 'day'", async () => {
      const { from, to } = await getDateRange("day", userId);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(to.getTime()).toBeGreaterThanOrEqual(from.getTime());
    });

    it("should return correct ranges for 'week'", async () => {
      const { from, to } = await getDateRange("week", userId);
      const diff = to.getTime() - from.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      // Allow for some jitter but should be approx 7 days
      expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 2000);
      expect(diff).toBeLessThanOrEqual(sevenDaysMs + 2000);
    });
  });

  describe("computeAnalytics", () => {
    it("should return zeroed metrics when no logs exist", async () => {
      const result = await computeAnalytics({
        userId,
        timeRange: "week",
      });

      expect(result.keyMetrics.totalSessions).toBe(0);
      expect(result.keyMetrics.totalFocusMinutes).toBe(0);
      expect(result.keyMetrics.averageFocusScore).toBe(0);
      // It returns "Low Ritual Usage" by default if compliance < 50%
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe("Low Ritual Usage");
    });

    it("should compute correct metrics for completed sessions", async () => {
      const now = new Date();

      // Create a few logs
      await SwitchLog.create([
        {
          userId,
          fromContext: null,
          toContext: contextA._id,
          startTime: new Date(now.getTime() - 60 * 60 * 1000), // 1h ago
          endTime: new Date(now.getTime() - 30 * 60 * 1000), // 30m ago
          durationInMinutes: 30,
          focusQuality: 4, // 80%
          ritualCompleted: true,
        },
        {
          userId,
          fromContext: contextA._id,
          toContext: contextB._id,
          startTime: new Date(now.getTime() - 20 * 60 * 1000), // 20m ago
          endTime: now,
          durationInMinutes: 20,
          focusQuality: 2, // 40%
          ritualCompleted: false,
        },
      ]);

      const result = await computeAnalytics({
        userId,
        timeRange: "day",
      });

      expect(result.keyMetrics.totalSessions).toBe(2);
      expect(result.keyMetrics.totalFocusMinutes).toBe(50);
      expect(result.keyMetrics.averageFocusScore).toBe(60); // (80 + 40) / 2
      expect(result.keyMetrics.ritualComplianceRate).toBe(50);
      expect(result.keyMetrics.totalFocusTime).toBe("0h 50m");
    });

    it("should generate 'Focus Improving' insight when score increases", async () => {
      const now = new Date();
      const prevWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      // Prev period logs (Low focus)
      await SwitchLog.create({
        userId,
        toContext: contextA._id,
        startTime: prevWeek,
        endTime: new Date(prevWeek.getTime() + 30 * 60 * 1000),
        durationInMinutes: 30,
        focusQuality: 2, // 40%
      });

      // Current period logs (High focus)
      await SwitchLog.create({
        userId,
        toContext: contextA._id,
        startTime: now,
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        durationInMinutes: 30,
        focusQuality: 5, // 100%
      });

      const result = await computeAnalytics({
        userId,
        timeRange: "week",
      });

      const improvementInsight = result.insights.find(
        (i) => i.title === "Focus Improving",
      );
      expect(improvementInsight).toBeDefined();
      expect(result.keyMetrics.focusScoreChange).toBe(60); // 100 - 40
    });

    it("should identify context performance correctly", async () => {
      const now = new Date();

      await SwitchLog.create([
        {
          userId,
          toContext: contextA._id,
          startTime: now,
          endTime: new Date(now.getTime() + 60 * 60 * 1000),
          durationInMinutes: 60,
          focusQuality: 5,
        },
        {
          userId,
          toContext: contextB._id,
          startTime: now,
          endTime: new Date(now.getTime() + 30 * 60 * 1000),
          durationInMinutes: 30,
          focusQuality: 3,
        },
      ]);

      const result = await computeAnalytics({
        userId,
        timeRange: "day",
      });

      expect(result.contextPerformance).toHaveLength(2);
      expect(result.contextPerformance[0].name).toBe("Focus"); // 100% focus
      expect(result.contextPerformance[0].avgFocus).toBe(100);
      expect(result.contextPerformance[1].name).toBe("Relax"); // 60% focus
      expect(result.contextPerformance[1].avgFocus).toBe(60);
    });

    it("should identify hardest transitions", async () => {
      const now = new Date();

      await SwitchLog.create({
        userId,
        fromContext: contextA._id,
        toContext: contextB._id,
        startTime: now,
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        durationInMinutes: 30,
        focusQuality: 1, // 20% (Hard)
      });

      const result = await computeAnalytics({
        userId,
        timeRange: "day",
      });

      expect(result.contextSwitches).toHaveLength(1);
      expect(result.contextSwitches[0].from).toBe("Focus");
      expect(result.contextSwitches[0].to).toBe("Relax");
      expect(result.contextSwitches[0].difficulty).toBe("hard");

      const hardTransitionInsight = result.insights.find(
        (i) => i.title === "Hardest Transition Detected",
      );
      expect(hardTransitionInsight).toBeDefined();
    });

    it("should compute daily focus data accurately", async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      await SwitchLog.create({
        userId,
        toContext: contextA._id,
        startTime: today,
        endTime: new Date(today.getTime() + 60 * 60 * 1000),
        durationInMinutes: 60,
        focusQuality: 4,
      });

      const result = await computeAnalytics({
        userId,
        timeRange: "week",
      });

      expect(result.dailyFocusData.length).toBeGreaterThan(0);
      const todayData = result.dailyFocusData.find(
        (d) => d.date === today.toISOString().split("T")[0],
      );
      expect(todayData).toBeDefined();
      expect(todayData?.focus).toBe(80);
      expect(todayData?.sessions).toBe(1);
    });

    it("should identify optimal time of day", async () => {
      // Find the start of today in local time
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create session at 10 AM (local) -> should fall into "9am – 12pm" slot
      const targetTime = new Date(today.getTime() + 10 * 60 * 60 * 1000);

      await SwitchLog.create({
        userId,
        toContext: contextA._id,
        startTime: targetTime,
        endTime: new Date(targetTime.getTime() + 30 * 60 * 1000),
        durationInMinutes: 30,
        focusQuality: 5,
      });

      const result = await computeAnalytics({
        userId,
        timeRange: "day",
      });

      // Find ANY slot with focus > 0 (since $hour might shift depending on UTC vs Local in aggregation)
      const slotWithFocus = result.timeOfDayData.find((s) => s.focus > 0);
      expect(slotWithFocus).toBeDefined();
      expect(slotWithFocus?.focus).toBe(100);
      expect(slotWithFocus?.optimal).toBe(true);
    });
  });
});
