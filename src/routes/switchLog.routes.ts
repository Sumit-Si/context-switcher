import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createSwitchLog,
  deleteSwitchLogById,
  endSession,
  getActiveSession,
  getAllSwitchLogs,
  getSwitchLogById,
  updateSwitchLogById,
} from "../controllers/switchLog.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createSwitchLogPostValidator,
  updateSwitchLogPatchValidator,
} from "../validators";

const router = Router();

/**
 * @swagger
 * /api/v1/switch-logs:
 *   get:
 *     summary: Get all switch logs
 *     description: Retrieve all switch logs for the authenticated user with pagination and sorting support
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: startTime
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Switch logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Switch logs fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     switchLogs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SwitchLog'
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new switch log
 *     description: Create a new context switch log. Automatically closes any active session for the user.
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toContext
 *             properties:
 *               fromContext:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *                 description: Context ID switching from (optional)
 *               toContext:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439012
 *                 description: Context ID switching to (required)
 *               ritualId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439013
 *                 description: Ritual ID if using a ritual (optional)
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Starting deep work session
 *     responses:
 *       201:
 *         description: Switch log created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Switch log created successfully
 *                 data:
 *                   $ref: '#/components/schemas/SwitchLog'
 *       400:
 *         description: Bad Request - Cannot switch to the same context or context doesn't belong to user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/")
  .get(verifyJWT, getAllSwitchLogs)
  .post(verifyJWT, validate(createSwitchLogPostValidator), createSwitchLog);

/**
 * @swagger
 * /api/v1/switch-logs/active:
 *   get:
 *     summary: Get active session
 *     description: Retrieve the currently active context switch session (session without endTime)
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active session retrieved successfully (or null if no active session)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Active session fetched successfully
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/SwitchLog'
 *                     - type: 'null'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/active").get(verifyJWT, getActiveSession);

/**
 * @swagger
 * /api/v1/switch-logs/{id}:
 *   get:
 *     summary: Get switch log by ID
 *     description: Retrieve a specific switch log by its ID
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Switch log ID
 *     responses:
 *       200:
 *         description: Switch log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Switch log fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/SwitchLog'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Switch log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update switch log
 *     description: Update an existing switch log. Only focusQuality, distraction, notes, and projectTag can be updated.
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Switch log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focusQuality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Focus quality rating (1-5)
 *               distraction:
 *                 type: string
 *                 maxLength: 500
 *                 example: Phone notifications
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Very productive session
 *               projectTag:
 *                 type: string
 *                 maxLength: 100
 *                 example: Project Alpha
 *     responses:
 *       200:
 *         description: Switch log updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Switch log updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/SwitchLog'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Switch log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete switch log
 *     description: Soft delete a switch log by its ID (sets deletedAt timestamp)
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Switch log ID
 *     responses:
 *       200:
 *         description: Switch log deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Switch log deleted successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Switch log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/:id")
  .get(verifyJWT, getSwitchLogById)
  .patch(
    verifyJWT,
    validate(updateSwitchLogPatchValidator),
    updateSwitchLogById,
  )
  .delete(verifyJWT, deleteSwitchLogById);

/**
 * @swagger
 * /api/v1/switch-logs/{id}/end:
 *   patch:
 *     summary: End active session
 *     description: End an active context switch session by setting endTime and calculating duration
 *     tags: [Switch Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Switch log ID
 *     responses:
 *       200:
 *         description: Session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Session ended successfully
 *                 data:
 *                   $ref: '#/components/schemas/SwitchLog'
 *       400:
 *         description: Bad Request - Session already ended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Switch log not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/:id/end").patch(verifyJWT, endSession);

export default router;
