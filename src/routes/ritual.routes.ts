import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createRitual, deleteRitualById, getAllRituals, getRitualById, incrementRitualUsage, updateRitualById } from "../controllers/ritual.controller";
import { validate } from "../middlewares/validate.middleware";
import { createRitualPostValidator, updateRitualPatchValidator } from "../validators";


const router = Router();

/**
 * @swagger
 * /api/v1/rituals:
 *   get:
 *     summary: Get all rituals
 *     description: Retrieve all rituals for the authenticated user with pagination support
 *     tags: [Rituals]
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
 *     responses:
 *       200:
 *         description: Rituals retrieved successfully
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
 *                   example: Rituals fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     rituals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ritual'
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
 *     summary: Create a new ritual
 *     description: Create a new ritual for the authenticated user
 *     tags: [Rituals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ritualType
 *               - totalDuration
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Morning Focus
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Morning ritual to start the day focused
 *               ritualType:
 *                 type: string
 *                 enum: [start, end, transition]
 *                 example: start
 *               totalDuration:
 *                 type: integer
 *                 minimum: 60
 *                 maximum: 3600
 *                 example: 300
 *                 description: Total duration in seconds
 *               steps:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - stepType
 *                     - duration
 *                   properties:
 *                     stepType:
 *                       type: string
 *                       enum: [breathe, braindump, move, intention, pause]
 *                       example: breathe
 *                     duration:
 *                       type: integer
 *                       minimum: 10
 *                       maximum: 600
 *                       example: 60
 *                       description: Step duration in seconds
 *                     instruction:
 *                       type: string
 *                       maxLength: 500
 *                       example: Take 5 deep breaths
 *     responses:
 *       201:
 *         description: Ritual created successfully
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
 *                   example: Ritual created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Ritual'
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
    .get(verifyJWT, getAllRituals)
    .post(verifyJWT, validate(createRitualPostValidator), createRitual);

/**
 * @swagger
 * /api/v1/rituals/{id}:
 *   get:
 *     summary: Get ritual by ID
 *     description: Retrieve a specific ritual by its ID
 *     tags: [Rituals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ritual ID
 *     responses:
 *       200:
 *         description: Ritual retrieved successfully
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
 *                   example: Ritual fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/Ritual'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ritual not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update ritual
 *     description: Update an existing ritual by its ID
 *     tags: [Rituals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ritual ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Evening Wind Down
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Updated description
 *               ritualType:
 *                 type: string
 *                 enum: [start, end, transition]
 *                 example: end
 *               totalDuration:
 *                 type: integer
 *                 minimum: 60
 *                 maximum: 3600
 *                 example: 420
 *               steps:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     stepType:
 *                       type: string
 *                       enum: [breathe, braindump, move, intention, pause]
 *                     duration:
 *                       type: integer
 *                       minimum: 10
 *                       maximum: 600
 *                     instruction:
 *                       type: string
 *                       maxLength: 500
 *     responses:
 *       200:
 *         description: Ritual updated successfully
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
 *                   example: Ritual updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Ritual'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ritual not found
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
 *     summary: Delete ritual
 *     description: Soft delete a ritual by its ID (sets deletedAt timestamp)
 *     tags: [Rituals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ritual ID
 *     responses:
 *       200:
 *         description: Ritual deleted successfully
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
 *                   example: Ritual deleted successfully
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
 *         description: Ritual not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
    .route("/:id")
    .get(verifyJWT, getRitualById)
    .patch(verifyJWT, validate(updateRitualPatchValidator), updateRitualById)
    .delete(verifyJWT, deleteRitualById);

/**
 * @swagger
 * /api/v1/rituals/{id}/use:
 *   post:
 *     summary: Record ritual usage
 *     description: Increment the usage count for a ritual when the user actually uses it
 *     tags: [Rituals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ritual ID
 *     responses:
 *       200:
 *         description: Ritual usage recorded successfully
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
 *                   example: Ritual usage recorded successfully
 *                 data:
 *                   $ref: '#/components/schemas/Ritual'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ritual not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/:id/use").post(verifyJWT, incrementRitualUsage);

export default router;