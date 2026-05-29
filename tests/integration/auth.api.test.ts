import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import User from "../../src/models/user.model";
import jwt from "jsonwebtoken";
import config from "../../src/config/config";
import crypto from "crypto";

describe("Authentication API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let testUser: any;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});

    // Create a verified test user
    testUser = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "Test@1234",
      isEmailVerified: true,
    });
    userId = testUser._id.toString();

    // Generate auth token
    authToken = jwt.sign({ _id: userId }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: config.ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    });
  });

  describe("POST /api/v1/auth/register", () => {
    it("should create a new user with valid data", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        password: "NewUser@123",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe("newuser");
      expect(response.body.data.email).toBe("newuser@example.com");
      expect(response.body.data.isEmailVerified).toBe(false);
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
    });

    it("should reject registration with duplicate email", async () => {
      const userData = {
        username: "anotheruser",
        email: "test@example.com", // Already exists
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/email|User already exists/);
    });

    it("should reject registration with duplicate username", async () => {
      const userData = {
        username: "testuser", // Already exists
        email: "different@example.com",
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/username|User already exists/);
    });

    it("should reject registration with invalid email format", async () => {
      const userData = {
        username: "newuser",
        email: "invalid-email",
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should reject registration with weak password", async () => {
      const userData = {
        username: "newuser",
        email: "newuser@example.com",
        password: "123", // Too weak
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should reject registration with missing required fields", async () => {
      const userData = {
        username: "newuser",
        // Missing email and password
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login user with valid credentials and return JWT tokens", async () => {
      const loginData = {
        email: "test@example.com",
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.loggedInUser).toBeDefined();
      expect(response.body.data.loggedInUser.email).toBe("test@example.com");
      expect(response.body.data.loggedInUser.password).toBeUndefined();

      // Check that cookies are set
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(
        cookieArray.some((cookie: string) => cookie.includes("accessToken")),
      ).toBe(true);
      expect(
        cookieArray.some((cookie: string) => cookie.includes("refreshToken")),
      ).toBe(true);
    });

    it("should reject login with invalid email", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject login with invalid password", async () => {
      const loginData = {
        email: "test@example.com",
        password: "WrongPassword@123",
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject login for unverified email", async () => {
      // Create unverified user
      await User.create({
        username: "unverified",
        email: "unverified@example.com",
        password: "Test@1234",
        isEmailVerified: false,
      });

      const loginData = {
        email: "unverified@example.com",
        password: "Test@1234",
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("verify");
    });

    it("should reject login with missing credentials", async () => {
      const loginData = {
        email: "test@example.com",
        // Missing password
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/refresh-access-token", () => {
    it("should refresh access token with valid refresh token", async () => {
      // First login to get refresh token
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Test@1234",
      });

      const cookies = loginResponse.headers["set-cookie"];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieArray.find((cookie: string) =>
        cookie.includes("refreshToken"),
      );

      expect(refreshTokenCookie).toBeDefined();

      // Now use refresh token to get new access token
      const response = await request(app)
        .post("/api/v1/auth/refresh-access-token")
        .set("Cookie", refreshTokenCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("refreshed");

      // Check that new tokens are set in cookies
      const newCookies = response.headers["set-cookie"];
      expect(newCookies).toBeDefined();
      const newCookieArray = Array.isArray(newCookies)
        ? newCookies
        : [newCookies];
      expect(
        newCookieArray.some((cookie: string) => cookie.includes("accessToken")),
      ).toBe(true);
      expect(
        newCookieArray.some((cookie: string) =>
          cookie.includes("refreshToken"),
        ),
      ).toBe(true);
    });

    it("should reject refresh with missing refresh token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh-access-token")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Token");
    });

    it("should reject refresh with invalid refresh token", async () => {
      const invalidToken = "invalid.token.here";

      const response = await request(app)
        .post("/api/v1/auth/refresh-access-token")
        .set("Cookie", `refreshToken=${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("invalid");
    });

    it("should reject refresh with expired refresh token", async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { _id: userId },
        config.REFRESH_TOKEN_SECRET,
        { expiresIn: "0s" }, // Expired immediately
      );

      // Wait a moment to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .post("/api/v1/auth/refresh-access-token")
        .set("Cookie", `refreshToken=${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("invalid");
    });
  });

  describe("Authentication Middleware - Invalid Tokens", () => {
    it("should reject request with missing authentication token", async () => {
      const response = await request(app).get("/api/v1/auth/me").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Unauthorized");
    });

    it("should reject request with invalid token format", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.format")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject request with expired access token", async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { _id: userId },
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: "0s" }, // Expired immediately
      );

      // Wait a moment to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("TOKEN_EXPIRED");
    });

    it("should reject request with token signed with wrong secret", async () => {
      const wrongToken = jwt.sign({ _id: userId }, "wrong-secret-key", {
        expiresIn: "15m",
      });

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${wrongToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject request with token for non-existent user", async () => {
      const fakeUserId = "507f1f77bcf86cd799439011";
      const fakeToken = jwt.sign(
        { _id: fakeUserId },
        config.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
      );

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Unauthorized");
    });

    it("should accept valid token in Authorization header", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
    });

    it("should accept valid token in cookie", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", `accessToken=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout user and clear tokens", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("logged out");

      // Check that cookies are cleared
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(
        cookieArray.some(
          (cookie: string) =>
            cookie.includes("accessToken=;") ||
            (cookie.includes("accessToken") &&
              cookie.includes("Thu, 01 Jan 1970")),
        ),
      ).toBe(true);
    });

    it("should reject logout without authentication", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
      expect(response.body.data.username).toBe("testuser");
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.refreshToken).toBeUndefined();
    });

    it("should reject profile request without authentication", async () => {
      const response = await request(app).get("/api/v1/auth/me").expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("should send password reset email for existing user", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "test@example.com" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("reset");

      // Verify token was set in database
      const user = await User.findById(userId).select(
        "+passwordResetToken +passwordResetExpiry",
      );
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpiry).toBeDefined();
    });

    it("should return success even for non-existent email (security)", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("reset");
    });

    it("should reject forgot password with invalid email format", async () => {
      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "invalid-email" })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/reset-password/:token", () => {
    it("should reset password with valid token", async () => {
      // Generate reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Set token in database
      await User.findByIdAndUpdate(userId, {
        passwordResetToken: hashedToken,
        passwordResetExpiry: tokenExpiry,
      });

      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${rawToken}`)
        .send({ password: "NewPassword@123" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("reset");

      // Verify password was changed
      const user = await User.findById(userId).select("+password");
      const isNewPassword = await user?.isPasswordCorrect("NewPassword@123");
      expect(isNewPassword).toBe(true);

      // Verify token was cleared
      const updatedUser = await User.findById(userId).select(
        "+passwordResetToken",
      );
      expect(updatedUser?.passwordResetToken).toBeUndefined();
    });

    it("should reject reset with invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/reset-password/invalid-token")
        .send({ password: "NewPassword@123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("invalid");
    });

    it("should reject reset with expired token", async () => {
      // Generate expired token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiredDate = new Date(Date.now() - 1000); // Already expired

      await User.findByIdAndUpdate(userId, {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiredDate,
      });

      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${rawToken}`)
        .send({ password: "NewPassword@123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("expired");
    });

    it("should reject reset with weak password", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.findByIdAndUpdate(userId, {
        passwordResetToken: hashedToken,
        passwordResetExpiry: tokenExpiry,
      });

      const response = await request(app)
        .post(`/api/v1/auth/reset-password/${rawToken}`)
        .send({ password: "123" }) // Too weak
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    it("should change password with valid current password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "Test@1234",
          newPassword: "NewPassword@123",
          confirmPassword: "NewPassword@123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("changed");

      // Verify password was changed
      const user = await User.findById(userId).select("+password");
      const isNewPassword = await user?.isPasswordCorrect("NewPassword@123");
      expect(isNewPassword).toBe(true);
    });

    it("should reject change password with wrong current password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "WrongPassword@123",
          newPassword: "NewPassword@123",
          confirmPassword: "NewPassword@123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid");
    });

    it("should reject change password without authentication", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .send({
          currentPassword: "Test@1234",
          newPassword: "NewPassword@123",
          confirmPassword: "NewPassword@123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject change password with weak new password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "Test@1234",
          newPassword: "123", // Too weak
          confirmPassword: "123",
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      // Create unverified user with verification token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const unverifiedUser = await User.create({
        username: "unverified",
        email: "unverified@example.com",
        password: "Test@1234",
        isEmailVerified: false,
        emailVerifyToken: hashedToken,
        emailVerifyExpiry: tokenExpiry,
      });

      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${rawToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("verified");
      expect(response.body.data.isEmailVerified).toBe(true);

      // Verify in database
      const verifiedUser = await User.findById(unverifiedUser._id);
      expect(verifiedUser?.isEmailVerified).toBe(true);
    });

    it("should reject verification with invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/verify-email?token=invalid-token")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("invalid");
    });

    it("should reject verification with expired token", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiredDate = new Date(Date.now() - 1000); // Already expired

      await User.create({
        username: "expired",
        email: "expired@example.com",
        password: "Test@1234",
        isEmailVerified: false,
        emailVerifyToken: hashedToken,
        emailVerifyExpiry: expiredDate,
      });

      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${rawToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("expired");
    });

    it("should reject verification for already verified email", async () => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.create({
        username: "alreadyverified",
        email: "already@example.com",
        password: "Test@1234",
        isEmailVerified: true, // Already verified
        emailVerifyToken: hashedToken,
        emailVerifyExpiry: tokenExpiry,
      });

      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${rawToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already verified");
    });
  });
});
