import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createContext, deleteContextById, getAllContexts, getContextById, updateContextById } from "../controllers/context.controller";
import { validate } from "../middlewares/validate.middleware";
import { createContextPostValidator, updateContextPutValidator } from "../validators";

const router = Router();

// Get all contexts and create context
router
    .route("/")
    .get(verifyJWT, getAllContexts)
    .post(verifyJWT, validate(createContextPostValidator), createContext);

// Get, Update, Delete a context by id
router
    .route("/:id")
    .get(verifyJWT, getContextById)
    .put(verifyJWT,validate(updateContextPutValidator), updateContextById)
    .delete(verifyJWT, deleteContextById);

export default router;