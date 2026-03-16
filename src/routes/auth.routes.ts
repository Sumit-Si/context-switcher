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
import { generateAccessAndRefreshToken } from "../utils/tokenUtils";

const router = Router();

// register user
router
  .route("/register")
  .post(validate(registerUserPostValidator), registerUser);

// verfiy user
router.route("/verify-email").get(verifyEmail);

// login user
router.route("/login").post(validate(loginUserPostValidator), loginUser);

// logout user
router.route("/logout").post(verifyJWT, logout);

// refresh token
router.route("/refresh-access-token").post(verifyJWT, refreshAccessToken);

// profile user
router.route("/me").get(verifyJWT, profile);

// forgot password
router.route("/forgot-password").post(verifyEmail, validate(forgotPasswordPostValidator), forgotPassword);

// reset password
router.route("/reset-password/:token").post(verifyJWT, validate(resetPasswordPostValidator), resetPassword);

// OAuth routes
router.route("/google").get(passport.authenticate("google", {
  scope: ["email", "profile"],
}));

router.route("/google/callback").get(passport.authenticate("google", {
  session: false,
  failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
}), loginWithGoogle);

export default router;
