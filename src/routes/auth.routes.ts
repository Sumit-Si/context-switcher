import { Router } from "express";
import { loginUser, registerUser } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { registerUserPostValidator } from "../validators";

const router = Router();

// register user
router
  .route("/register")
  .post(validate(registerUserPostValidator), registerUser);

// login user
router.route("/login").post(loginUser);

export default router;
