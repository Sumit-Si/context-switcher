import { describe, it, expect, beforeEach } from "vitest";
import { ContextService } from "../../src/services/context.service";
import Context from "../../src/models/context.model";
import { Types } from "mongoose";
import { ApiError } from "../../src/utils/ApiError";

describe("ContextService Unit Tests", () => {
  let contextService: ContextService;
  let testUserId: string;

  beforeEach(async () => {
    contextService = new ContextService();
    testUserId = new Types.ObjectId().toString();

    // Clear contexts collection
    await Context.deleteMany({});
  });

  describe("checkDuplicate", () => {
    it("should return false when no duplicate exists", async () => {
      const isDuplicate = await contextService.checkDuplicate(
        "Work",
        testUserId,
      );
      expect(isDuplicate).toBe(false);
    });

    it("should return true when duplicate exists for same user", async () => {
      await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const isDuplicate = await contextService.checkDuplicate(
        "Work",
        testUserId,
      );
      expect(isDuplicate).toBe(true);
    });

    it("should return false when duplicate exists for different user", async () => {
      const otherUserId = new Types.ObjectId().toString();
      await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(otherUserId),
      });

      const isDuplicate = await contextService.checkDuplicate(
        "Work",
        testUserId,
      );
      expect(isDuplicate).toBe(false);
    });

    it("should exclude specified ID when checking duplicates", async () => {
      const context = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const isDuplicate = await contextService.checkDuplicate(
        "Work",
        testUserId,
        context._id.toString(),
      );
      expect(isDuplicate).toBe(false);
    });

    it("should ignore soft-deleted contexts", async () => {
      await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
        deletedAt: new Date(),
      });

      const isDuplicate = await contextService.checkDuplicate(
        "Work",
        testUserId,
      );
      expect(isDuplicate).toBe(false);
    });
  });

  describe("create", () => {
    it("should create a context with valid data", async () => {
      const contextData = {
        name: "Work",
        icon: "💼",
        description: "Work context",
        color: "#FF5733",
      };

      const context = await contextService.create(contextData, testUserId);

      expect(context.name).toBe("Work");
      expect(context.icon).toBe("💼");
      expect(context.description).toBe("Work context");
      expect(context.userId.toString()).toBe(testUserId);
    });

    it("should throw 409 error when duplicate name exists", async () => {
      await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const contextData = {
        name: "Work",
        icon: "🏢",
      };

      await expect(
        contextService.create(contextData, testUserId),
      ).rejects.toThrow(ApiError);
      await expect(
        contextService.create(contextData, testUserId),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Context with this name already exists",
      });
    });

    it("should allow same name for different users", async () => {
      const otherUserId = new Types.ObjectId().toString();

      await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(otherUserId),
      });

      const contextData = {
        name: "Work",
        icon: "🏢",
      };

      const context = await contextService.create(contextData, testUserId);
      expect(context.name).toBe("Work");
      expect(context.userId.toString()).toBe(testUserId);
    });
  });

  describe("getAll", () => {
    it("should return paginated contexts for user", async () => {
      // Create contexts for test user
      await Context.create([
        { name: "Work", icon: "💼", userId: new Types.ObjectId(testUserId) },
        { name: "Study", icon: "📚", userId: new Types.ObjectId(testUserId) },
        { name: "Gym", icon: "💪", userId: new Types.ObjectId(testUserId) },
      ]);

      // Create context for different user
      const otherUserId = new Types.ObjectId().toString();
      await Context.create({
        name: "Other",
        icon: "🎯",
        userId: new Types.ObjectId(otherUserId),
      });

      const result = await contextService.getAll(testUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should exclude soft-deleted contexts", async () => {
      await Context.create([
        { name: "Work", icon: "💼", userId: new Types.ObjectId(testUserId) },
        {
          name: "Deleted",
          icon: "🗑️",
          userId: new Types.ObjectId(testUserId),
          deletedAt: new Date(),
        },
      ]);

      const result = await contextService.getAll(testUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Work");
    });

    it("should handle pagination correctly", async () => {
      // Create 5 contexts
      for (let i = 1; i <= 5; i++) {
        await Context.create({
          name: `Context ${i}`,
          icon: "📌",
          userId: new Types.ObjectId(testUserId),
        });
      }

      const result = await contextService.getAll(testUserId, {
        page: 2,
        limit: 2,
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe("getById", () => {
    it("should return context by ID for user", async () => {
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const context = await contextService.getById(
        (created as any)._id.toString(),
        testUserId,
      );

      expect(context.name).toBe("Work");
      expect((context as any)._id.toString()).toBe(
        (created as any)._id.toString(),
      );
    });

    it("should throw 404 when context not found", async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(contextService.getById(fakeId, testUserId)).rejects.toThrow(
        ApiError,
      );
      await expect(
        contextService.getById(fakeId, testUserId),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Context not found",
      });
    });

    it("should throw 404 when context belongs to different user", async () => {
      const otherUserId = new Types.ObjectId().toString();
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        contextService.getById(created._id.toString(), testUserId),
      ).rejects.toThrow(ApiError);
    });

    it("should throw 404 for soft-deleted context", async () => {
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
        deletedAt: new Date(),
      });

      await expect(
        contextService.getById(created._id.toString(), testUserId),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update context with valid data", async () => {
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const updated = await contextService.update(
        created._id.toString(),
        { name: "Work Updated", description: "New description" },
        testUserId,
      );

      expect(updated.name).toBe("Work Updated");
      expect(updated.description).toBe("New description");
    });

    it("should throw 409 when updating to duplicate name", async () => {
      await Context.create({
        name: "Existing",
        icon: "📌",
        userId: new Types.ObjectId(testUserId),
      });

      const toUpdate = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      await expect(
        contextService.update(
          toUpdate._id.toString(),
          { name: "Existing" },
          testUserId,
        ),
      ).rejects.toThrow(ApiError);
      await expect(
        contextService.update(
          toUpdate._id.toString(),
          { name: "Existing" },
          testUserId,
        ),
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it("should allow updating same name (no change)", async () => {
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      const updated = await contextService.update(
        created._id.toString(),
        { name: "Work", description: "Updated description" },
        testUserId,
      );

      expect(updated.name).toBe("Work");
      expect(updated.description).toBe("Updated description");
    });

    it("should throw 404 when context not found", async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(
        contextService.update(fakeId, { name: "Updated" }, testUserId),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("delete", () => {
    it("should soft delete context", async () => {
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(testUserId),
      });

      await contextService.delete(created._id.toString(), testUserId);

      const deleted = await Context.findById(created._id);
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it("should throw 404 when context not found", async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(contextService.delete(fakeId, testUserId)).rejects.toThrow(
        ApiError,
      );
      await expect(
        contextService.delete(fakeId, testUserId),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("should throw 404 when deleting context of different user", async () => {
      const otherUserId = new Types.ObjectId().toString();
      const created = await Context.create({
        name: "Work",
        icon: "💼",
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        contextService.delete(created._id.toString(), testUserId),
      ).rejects.toThrow(ApiError);
    });
  });
});
