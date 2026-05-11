import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createRitual, deleteRitualById, getAllRituals, getRitualById, incrementRitualUsage, updateRitualById } from "../controllers/ritual.controller";
import { validate } from "../middlewares/validate.middleware";
import { createRitualPostValidator, updateRitualPatchValidator } from "../validators";


const router = Router();

router
    .route("/")
    .get(verifyJWT, getAllRituals)
    .post(verifyJWT, validate(createRitualPostValidator), createRitual);

// Get, Update, Delete a ritual by id
router
    .route("/:id")
    .get(verifyJWT, getRitualById)
    .patch(verifyJWT, validate(updateRitualPatchValidator), updateRitualById)
    .delete(verifyJWT, deleteRitualById);

// Records that the user actually used this ritual
router.route("/:id/use").post(verifyJWT, incrementRitualUsage);

export default router;