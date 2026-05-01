import { Router } from "express";
import {
  loginUser,
  verifyEmail,
  registerUser,
  logout,
  refreshAccessToken,
  profile,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
  resendVerificationEmail,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  forgotPasswordPostValidator,
  loginUserPostValidator,
  registerUserPostValidator,
  resetPasswordPostValidator,
} from "../validators";
import { verifyJWT } from "../middlewares/auth.middleware";
import passport from "passport";
import { authLimiter } from "../config/rateLimiter";
import { rateLimit } from "../middlewares/rateLimit.middleware";

const router = Router();

// register user
router
  .route("/register")
  .post(authLimiter, validate(registerUserPostValidator), registerUser);

// verfiy user
router.route("/verify-email").get(verifyEmail);

// resend verify email
router
  .route("/resend-verification")
  .post(authLimiter, resendVerificationEmail);

// login user
router.route("/login").post(authLimiter, rateLimit, validate(loginUserPostValidator), loginUser);

// logout user
router.route("/logout").post(verifyJWT, logout);

// refresh token
router.route("/refresh-access-token").post(authLimiter, refreshAccessToken);

// profile user
router.route("/me").get(verifyJWT, profile);

// forgot password
router.route("/forgot-password").post(authLimiter, validate(forgotPasswordPostValidator), forgotPassword);

// reset password
router.route("/reset-password/:token").post(authLimiter, validate(resetPasswordPostValidator), resetPassword);

// OAuth routes
router.route("/google").get(passport.authenticate("google", {
  scope: ["email", "profile"],
}));

router.route("/google/callback").get(passport.authenticate("google", {
  session: false,
  failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
}), loginWithGoogle);

export default router;
