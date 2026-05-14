import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createSwitchLog, deleteSwitchLogById, endSession, getActiveSession, getAllSwitchLogs, getSwitchLogById, updateSwitchLogById } from "../controllers/switchLog.controller";
import { validate } from "../middlewares/validate.middleware";
import { createSwitchLogPostValidator, updateSwitchLogPatchValidator } from "../validators";


const router = Router();

// Get all switch logs and create switch log
router
    .route("/")
    .get(verifyJWT, getAllSwitchLogs)
    .post(verifyJWT, validate(createSwitchLogPostValidator), createSwitchLog);

// Get Active Context Session
// CRITICAL: /active MUST come before /:id or Express will treat "active" as id param
router
    .route("/active")
    .get(verifyJWT, getActiveSession);

// Get, Update, Delete a switch log by id
router
    .route("/:id")
    .get(verifyJWT, getSwitchLogById)
    .patch(verifyJWT, validate(updateSwitchLogPatchValidator), updateSwitchLogById)
    .delete(verifyJWT, deleteSwitchLogById);

// End Session
router
    .route("/:id/end")
    .patch(verifyJWT, endSession);


export default router;