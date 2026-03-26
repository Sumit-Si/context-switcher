import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createRitual, deleteRitualById, getAllRituals, getRitualById, updateRitualById } from "../controllers/ritual.controller";
import { validate } from "../middlewares/validate.middleware";
import { createRitualPostValidator, updateRitualPutValidator } from "../validators";


const router = Router();

router
    .route("/")
    .get(verifyJWT, getAllRituals)
    .post(verifyJWT, validate(createRitualPostValidator), createRitual);

// Get, Update, Delete a ritual by id
router
    .route("/:id")
    .get(verifyJWT, getRitualById)
    .put(verifyJWT, validate(updateRitualPutValidator), updateRitualById)
    .delete(verifyJWT, deleteRitualById);

export default router;