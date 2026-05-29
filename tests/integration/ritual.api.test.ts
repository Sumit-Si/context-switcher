import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import User from "../../src/models/user.model";
import Ritual from "../../src/models/ritual.model";
import jwt from "jsonwebtoken";
import config from "../../src/config/config";

describe("Ritual API Integration Tests", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Ritual.deleteMany({});

    // Create a test user
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "Test@1234",
      isEmailVerified: true,
    });
    userId = user._id.toString();

    // Generate auth token
    authToken = jwt.sign(
      { _id: userId, email: user.email },
      config.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" },
    );
  });

  describe("POST /api/v1/rituals", () => {
    it("should create a new ritual with valid data", async () => {
      const ritualData = {
        name: "Morning Focus",
        description: "A ritual to start the day with focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
          {
            type: "intention",
            duration: 120,
            prompt: "Set your intention for the day",
          },
        ],
        targetTransition: {
          fromContext: "rest",
          toContext: "work",
        },
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Morning Focus");
      expect(response.body.data.ritualType).toBe("custom");
      expect(response.body.data.totalDuration).toBe(300);
      expect(response.body.data.steps).toHaveLength(2);
    });

    it("should reject ritual creation without authentication", async () => {
      const ritualData = {
        name: "Morning Focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      await request(app).post("/api/v1/rituals").send(ritualData).expect(401);
    });

    it("should reject ritual with invalid name (too short)", async () => {
      const ritualData = {
        name: "a",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(422); // Validation errors return 422

      expect(response.body.success).toBe(false);
    });

    it("should reject ritual with invalid totalDuration (too high)", async () => {
      const ritualData = {
        name: "Long Ritual",
        ritualType: "custom",
        totalDuration: 4000, // Exceeds 3600 max
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(422); // Validation errors return 422

      expect(response.body.success).toBe(false);
    });

    it("should reject ritual with invalid step duration (too short)", async () => {
      const ritualData = {
        name: "Quick Ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 5, // Less than 10 seconds minimum
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(422); // Validation errors return 422

      expect(response.body.success).toBe(false);
    });

    it("should reject ritual with invalid step type", async () => {
      const ritualData = {
        name: "Invalid Ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "invalid_type", // Invalid step type
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(422); // Validation errors return 422

      expect(response.body.success).toBe(false);
    });

    it("should reject ritual with empty steps array", async () => {
      const ritualData = {
        name: "Empty Ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [], // Empty steps
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(422); // Validation errors return 422

      expect(response.body.success).toBe(false);
    });

    it("should reject duplicate ritual name for same user", async () => {
      const ritualData = {
        name: "Morning Focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      // Create first ritual
      await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it("should accept optional description field", async () => {
      const ritualData = {
        name: "Morning Focus",
        description: "A detailed description of the ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      };

      const response = await request(app)
        .post("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .send(ritualData)
        .expect(201);

      expect(response.body.data.description).toBe(
        "A detailed description of the ritual",
      );
    });
  });

  describe("GET /api/v1/rituals", () => {
    it("should return all rituals for authenticated user", async () => {
      // Create test rituals
      await Ritual.create([
        {
          userId,
          name: "Morning Focus",
          ritualType: "custom",
          totalDuration: 300,
          steps: [
            {
              type: "breathe",
              duration: 60,
              prompt: "Take deep breaths",
            },
          ],
          targetTransition: {
            fromContext: "rest",
            toContext: "work",
          },
        },
        {
          userId,
          name: "Evening Wind Down",
          ritualType: "template",
          totalDuration: 600,
          steps: [
            {
              type: "pause",
              duration: 120,
              prompt: "Reflect on the day",
            },
          ],
          targetTransition: {
            fromContext: "work",
            toContext: "rest",
          },
        },
      ]);

      const response = await request(app)
        .get("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // API returns { rituals: [], metadata: {} } structure
      expect(response.body.data.rituals).toHaveLength(2);
      expect(response.body.data.metadata).toBeDefined();
    });

    it("should return empty array when user has no rituals", async () => {
      const response = await request(app)
        .get("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rituals).toHaveLength(0);
    });

    it("should not return soft-deleted rituals", async () => {
      // Create rituals
      await Ritual.create([
        {
          userId,
          name: "Active Ritual",
          ritualType: "custom",
          totalDuration: 300,
          steps: [
            {
              type: "breathe",
              duration: 60,
              prompt: "Take deep breaths",
            },
          ],
          targetTransition: {},
        },
        {
          userId,
          name: "Deleted Ritual",
          ritualType: "custom",
          totalDuration: 300,
          steps: [
            {
              type: "breathe",
              duration: 60,
              prompt: "Take deep breaths",
            },
          ],
          targetTransition: {},
          deletedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get("/api/v1/rituals")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.rituals).toHaveLength(1);
      expect(response.body.data.rituals[0].name).toBe("Active Ritual");
    });

    it("should reject request without authentication", async () => {
      await request(app).get("/api/v1/rituals").expect(401);
    });
  });

  describe("PATCH /api/v1/rituals/:id", () => {
    it("should update ritual with valid data", async () => {
      const ritual = await Ritual.create({
        userId,
        name: "Morning Focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      const updateData = {
        name: "Updated Morning Focus",
        description: "Updated description",
      };

      const response = await request(app)
        .patch(`/api/v1/rituals/${ritual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Updated Morning Focus");
      expect(response.body.data.description).toBe("Updated description");
    });

    it("should allow partial updates", async () => {
      const ritual = await Ritual.create({
        userId,
        name: "Morning Focus",
        description: "Original description",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      const updateData = {
        name: "Updated Name Only",
      };

      const response = await request(app)
        .patch(`/api/v1/rituals/${ritual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe("Updated Name Only");
      expect(response.body.data.description).toBe("Original description"); // Unchanged
    });

    it("should reject update with invalid name (too short)", async () => {
      const ritual = await Ritual.create({
        userId,
        name: "Morning Focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      const updateData = {
        name: "a", // Too short
      };

      await request(app)
        .patch(`/api/v1/rituals/${ritual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(422); // Validation errors return 422
    });

    it("should return 404 for non-existent ritual", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      await request(app)
        .patch(`/api/v1/rituals/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated" })
        .expect(404);
    });

    it("should not allow updating other users rituals", async () => {
      // Create another user
      const otherUser = await User.create({
        username: "otheruser",
        email: "other@example.com",
        password: "Test@1234",
        isEmailVerified: true,
      });

      // Create ritual for other user
      const otherRitual = await Ritual.create({
        userId: otherUser._id,
        name: "Other Ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      // Try to update with first user's token
      await request(app)
        .patch(`/api/v1/rituals/${otherRitual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Hacked" })
        .expect(404);
    });
  });

  describe("DELETE /api/v1/rituals/:id", () => {
    it("should soft delete a ritual", async () => {
      const ritual = await Ritual.create({
        userId,
        name: "Morning Focus",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      const response = await request(app)
        .delete(`/api/v1/rituals/${ritual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deletedRitual = await Ritual.findById(ritual._id);
      expect(deletedRitual?.deletedAt).not.toBeNull();
    });

    it("should return 404 for non-existent ritual", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      await request(app)
        .delete(`/api/v1/rituals/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should not allow deleting other users rituals", async () => {
      // Create another user
      const otherUser = await User.create({
        username: "otheruser",
        email: "other@example.com",
        password: "Test@1234",
        isEmailVerified: true,
      });

      // Create ritual for other user
      const otherRitual = await Ritual.create({
        userId: otherUser._id,
        name: "Other Ritual",
        ritualType: "custom",
        totalDuration: 300,
        steps: [
          {
            type: "breathe",
            duration: 60,
            prompt: "Take deep breaths",
          },
        ],
        targetTransition: {},
      });

      // Try to delete with first user's token
      await request(app)
        .delete(`/api/v1/rituals/${otherRitual._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should return 500 for invalid ritual id format", async () => {
      // Invalid ObjectId format causes 500 error
      await request(app)
        .delete("/api/v1/rituals/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(500);
    });
  });
});
