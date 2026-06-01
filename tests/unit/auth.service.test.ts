import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthService } from "../../src/services/auth.service";
import User from "../../src/models/user.model";
import { ApiError } from "../../src/utils/ApiError";
import * as tokenUtils from "../../src/utils/tokenUtils";
import * as emailUtils from "../../src/utils/emailUtils";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Mock dependencies
vi.mock("../../src/models/user.model");
vi.mock("../../src/utils/tokenUtils");
vi.mock("../../src/utils/emailUtils");
vi.mock("jsonwebtoken");
vi.mock("../../src/config/cloudinary");
vi.mock("../../src/config/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AuthService Unit Tests", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("should successfully register a user", async () => {
      const mockData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const mockUserId = new mongoose.Types.ObjectId();
      const mockCreatedUser = {
        _id: mockUserId,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockRegisteredUser = {
        _id: mockUserId,
        username: mockData.username,
        email: mockData.email,
        isEmailVerified: false,
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      } as any);

      vi.mocked(User.create).mockResolvedValue(mockCreatedUser as any);

      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockRegisteredUser),
      } as any);

      vi.mocked(tokenUtils.generateEmailVerifyToken).mockReturnValue({
        rawToken: "raw",
        hashedToken: "hashed",
        expiry: new Date(),
      });

      const result = await authService.register(mockData);

      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledWith(mockData);
      expect(mockCreatedUser.save).toHaveBeenCalledWith({
        validateBeforeSave: false,
      });
      expect(emailUtils.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRegisteredUser);
    });

    it("should throw ApiError if user already exists", async () => {
      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: "123" }),
      } as any);

      await expect(
        authService.register({
          username: "test",
          email: "test@example.com",
          password: "pass",
        }),
      ).rejects.toThrow(ApiError);

      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should successfully login a user", async () => {
      const mockData = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        email: mockData.email,
        isEmailVerified: true,
        isPasswordCorrect: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      vi.mocked(tokenUtils.generateAccessAndRefreshToken).mockResolvedValue({
        accessToken: "access",
        refreshToken: "refresh",
      });

      const mockLoggedInUser = { ...mockUser, username: "testuser" };
      vi.mocked(User.findById).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockLoggedInUser),
      } as any);

      const result = await authService.login(mockData);

      expect(result.user).toEqual(mockLoggedInUser);
      expect(result.accessToken).toBe("access");
      expect(result.refreshToken).toBe("refresh");
    });

    it("should throw ApiError if email not verified", async () => {
      const mockUser = {
        isEmailVerified: false,
        isPasswordCorrect: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(User.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(
        authService.login({ email: "test@example.com", password: "pwd" }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("refreshTokens", () => {
    it("should throw ApiError if token is invalid", async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(authService.refreshTokens("invalid_token")).rejects.toThrow(
        ApiError,
      );
    });
  });
});
