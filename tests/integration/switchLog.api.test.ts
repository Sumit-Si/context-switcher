import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import User from "../../src/models/user.model";
import Context from "../../src/models/context.model";
import SwitchLog from "../../src/models/switchLog.model";
import jwt from "jsonwebtoken";
import config from "../../src/config/config";

describe("SwitchLog API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let contextId1: string;
  let contextId2: string;
  let user2Token: string;
  let user2Id: string;
  let user2ContextId: string;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Context.deleteMany({});
    await SwitchLog.deleteMany({});

    // Create test user 1
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "Test@1234",
      isEmailVerified: true,
    });
    userId = user._id.toString();

    // Generate auth token for user 1
    authToken = jwt.sign({ _id: userId }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: config.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });

    // Create test contexts for user 1
    const context1 = await Context.create({
      userId: user._id,
      name: "Deep Work",
      color: "#FF5733",
      icon: "brain",
      cognitiveLoad: "high",
      emotionalTone: "calm",
      energyRequired: "high",
    });
    contextId1 = context1._id.toString();

    const context2 = await Context.create({
      userId: user._id,
      name: "Shallow Work",
      color: "#33FF57",
      icon: "email",
      cognitiveLoad: "low",
      emotionalTone: "energetic",
      energyRequired: "low",
    });
    contextId2 = context2._id.toString();

    // Create test user 2
    const user2 = await User.create({
      username: "testuser2",
      email: "test2@example.com",
      password: "Test@1234",
      isEmailVerified: true,
    });
    user2Id = user2._id.toString();

    // Generate auth token for user 2
    user2Token = jwt.sign({ _id: user2Id }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: config.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });

    // Create test context for user 2
    const user2Context = await Context.create({
      userId: user2._id,
      name: "User 2 Context",
      color: "#5733FF",
      icon: "star",
      cognitiveLoad: "medium",
      emotionalTone: "analytical",
      energyRequired: "medium",
    });
    user2ContextId = user2Context._id.toString();
  });

  // Task 22.2: Write integration test for GET /switch-logs
  describe("GET /api/v1/switch-logs", () => {
    it("should return paginated results for authenticated user", async () => {
      // Create multiple switch logs for user 1
      await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });
      await SwitchLog.create({
        userId,
        fromContext: contextId2,
        toContext: contextId1,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      const response = await request(app)
        .get("/api/v1/switch-logs?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.switchLogs).toHaveLength(2);
      expect(response.body.data.metadata.totalSwitchLogs).toBe(2);
      expect(response.body.data.metadata.currentPage).toBe(1);
      expect(response.body.data.metadata.currentLimit).toBe(10);
    });

    it("should return correct pagination metadata", async () => {
      // Create 15 switch logs
      for (let i = 0; i < 15; i++) {
        await SwitchLog.create({
          userId,
          fromContext: contextId1,
          toContext: contextId2,
          startTime: new Date(),
          durationInMinutes: 0,
        });
      }

      const response = await request(app)
        .get("/api/v1/switch-logs?page=2&limit=10")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.switchLogs).toHaveLength(5);
      expect(response.body.data.metadata.totalSwitchLogs).toBe(15);
      expect(response.body.data.metadata.totalPages).toBe(2);
      expect(response.body.data.metadata.currentPage).toBe(2);
    });

    it("should sort switch logs correctly", async () => {
      const log1 = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date("2024-01-01"),
        durationInMinutes: 0,
      });
      const log2 = await SwitchLog.create({
        userId,
        fromContext: contextId2,
        toContext: contextId1,
        startTime: new Date("2024-01-02"),
        durationInMinutes: 0,
      });

      // Test descending order (default)
      const descResponse = await request(app)
        .get("/api/v1/switch-logs?sortBy=startTime&order=desc")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(descResponse.body.data.switchLogs[0]._id).toBe(
        log2._id.toString(),
      );

      // Test ascending order
      const ascResponse = await request(app)
        .get("/api/v1/switch-logs?sortBy=startTime&order=asc")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(ascResponse.body.data.switchLogs[0]._id).toBe(log1._id.toString());
    });

    it("should filter by userId (user only sees their own logs)", async () => {
      // Create logs for both users
      await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });
      await SwitchLog.create({
        userId: user2Id,
        fromContext: user2ContextId,
        toContext: user2ContextId,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      // User 1 should only see their own log
      const response = await request(app)
        .get("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.switchLogs).toHaveLength(1);
      expect(response.body.data.switchLogs[0].userId).toBe(userId);
    });

    it("should reject request without authentication", async () => {
      await request(app).get("/api/v1/switch-logs").expect(401);
    });
  });

  // Task 23.2: Write integration test for GET /switch-logs/active
  describe("GET /api/v1/switch-logs/active", () => {
    it("should return active session when one exists", async () => {
      // Create an active session (no endTime)
      const activeLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      const response = await request(app)
        .get("/api/v1/switch-logs/active")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(activeLog._id.toString());
      expect(response.body.data.endTime).toBeNull();
    });

    it("should return null when no active session exists", async () => {
      // Create a completed session (with endTime)
      await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        endTime: new Date(),
        durationInMinutes: 30,
      });

      const response = await request(app)
        .get("/api/v1/switch-logs/active")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it("should only return authenticated user's active session", async () => {
      // Create active sessions for both users
      await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });
      const user2Log = await SwitchLog.create({
        userId: user2Id,
        fromContext: user2ContextId,
        toContext: user2ContextId,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      // User 2 should only see their own active session
      const response = await request(app)
        .get("/api/v1/switch-logs/active")
        .set("Authorization", `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.data._id).toBe(user2Log._id.toString());
      expect(response.body.data.userId).toBe(user2Id);
    });

    it("should reject request without authentication", async () => {
      await request(app).get("/api/v1/switch-logs/active").expect(401);
    });
  });

  // Task 24.2: Write integration test for PATCH /switch-logs/:id
  describe("PATCH /api/v1/switch-logs/:id", () => {
    it("should update allowed fields successfully", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      const updateData = {
        focusQuality: 4,
        distraction: "Phone notifications",
        notes: "Good session overall",
        projectTag: "Project Alpha",
      };

      const response = await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.focusQuality).toBe(4);
      expect(response.body.data.distraction).toBe("Phone notifications");
      expect(response.body.data.notes).toBe("Good session overall");
      expect(response.body.data.projectTag).toBe("Project Alpha");
    });

    it("should validate focusQuality range (1-5)", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      // Test invalid focusQuality (too high)
      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ focusQuality: 6 })
        .expect(422);

      // Test invalid focusQuality (too low)
      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ focusQuality: 0 })
        .expect(422);
    });

    it("should validate string length limits", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      // Test distraction too long (max 200 characters)
      const longDistraction = "a".repeat(201);
      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ distraction: longDistraction })
        .expect(422);

      // Test notes too long (max 1000 characters)
      const longNotes = "a".repeat(1001);
      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ notes: longNotes })
        .expect(422);
    });

    it("should return 404 for non-existent switch log", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      await request(app)
        .patch(`/api/v1/switch-logs/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ focusQuality: 4 })
        .expect(404);
    });

    it("should reject request without authentication", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}`)
        .send({ focusQuality: 4 })
        .expect(401);
    });
  });

  // Task 25.2: Write integration test for POST /switch-logs/:id/end
  describe("PATCH /api/v1/switch-logs/:id/end", () => {
    it("should set endTime to current timestamp", async () => {
      const startTime = new Date();
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime,
        durationInMinutes: 0,
      });

      const beforeEnd = new Date();
      const response = await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}/end`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      const afterEnd = new Date();

      expect(response.body.success).toBe(true);
      expect(response.body.data.endTime).toBeTruthy();

      const endTime = new Date(response.body.data.endTime);
      expect(endTime.getTime()).toBeGreaterThanOrEqual(beforeEnd.getTime());
      expect(endTime.getTime()).toBeLessThanOrEqual(afterEnd.getTime());
    });

    it("should calculate durationInMinutes correctly", async () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime,
        durationInMinutes: 0,
      });

      const response = await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}/end`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.durationInMinutes).toBeGreaterThanOrEqual(29);
      expect(response.body.data.durationInMinutes).toBeLessThanOrEqual(31);
    });

    it("should return 400 if session already ended", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        endTime: new Date(),
        durationInMinutes: 30,
      });

      const response = await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}/end`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already ended");
    });

    it("should return 404 for non-existent switch log", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      await request(app)
        .patch(`/api/v1/switch-logs/${fakeId}/end`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should reject request without authentication", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      await request(app)
        .patch(`/api/v1/switch-logs/${switchLog._id}/end`)
        .expect(401);
    });
  });

  // Task 26.2: Write integration test for DELETE /switch-logs/:id
  describe("DELETE /api/v1/switch-logs/:id", () => {
    it("should perform soft delete (sets deletedAt)", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      const response = await request(app)
        .delete(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete in database
      const deletedLog = await SwitchLog.findById(switchLog._id);
      expect(deletedLog).toBeTruthy();
      expect(deletedLog?.deletedAt).toBeTruthy();
    });

    it("should not return soft-deleted log in GET /switch-logs", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      // Delete the log
      await request(app)
        .delete(`/api/v1/switch-logs/${switchLog._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Try to fetch all logs
      const response = await request(app)
        .get("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.switchLogs).toHaveLength(0);
    });

    it("should return 404 for non-existent switch log", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      await request(app)
        .delete(`/api/v1/switch-logs/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should reject request without authentication", async () => {
      const switchLog = await SwitchLog.create({
        userId,
        fromContext: contextId1,
        toContext: contextId2,
        startTime: new Date(),
        durationInMinutes: 0,
      });

      await request(app)
        .delete(`/api/v1/switch-logs/${switchLog._id}`)
        .expect(401);
    });
  });

  // Task 27.2: Write integration test for context ownership validation
  describe("POST /api/v1/switch-logs - Context Ownership Validation", () => {
    it("should reject switch log with context from different user", async () => {
      const switchLogData = {
        fromContext: contextId1,
        toContext: user2ContextId, // User 2's context
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("does not belong to user");
    });

    it("should accept switch log with user's own contexts", async () => {
      const switchLogData = {
        fromContext: contextId1,
        toContext: contextId2,
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fromContext).toBeTruthy();
      expect(response.body.data.toContext).toBeTruthy();
    });

    it("should validate fromContext ownership when provided", async () => {
      const switchLogData = {
        fromContext: user2ContextId, // User 2's context
        toContext: contextId2,
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("does not belong to user");
    });
  });

  // Task 28.2: Write integration test for same context rejection
  describe("POST /api/v1/switch-logs - Same Context Rejection", () => {
    it("should reject switch log where fromContext equals toContext", async () => {
      const switchLogData = {
        fromContext: contextId1,
        toContext: contextId1, // Same as fromContext
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain(
        "Cannot switch to the same context",
      );
    });

    it("should accept switch log where contexts are different", async () => {
      const switchLogData = {
        fromContext: contextId1,
        toContext: contextId2,
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it("should accept switch log without fromContext", async () => {
      const switchLogData = {
        toContext: contextId2,
      };

      const response = await request(app)
        .post("/api/v1/switch-logs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(switchLogData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fromContext).toBeNull();
    });
  });
});
