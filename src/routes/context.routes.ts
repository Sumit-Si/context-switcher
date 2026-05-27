import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createContext, deleteContextById, getAllContexts, getContextById, updateContextById } from "../controllers/context.controller";
import { validate } from "../middlewares/validate.middleware";
import { createContextPostValidator, updateContextPatchValidator } from "../validators";

const router = Router();

/**
 * @swagger
 * /api/v1/contexts:
 *   get:
 *     summary: Get all contexts
 *     description: Retrieve all contexts for the authenticated user with pagination support
 *     tags: [Contexts]
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
 *           default: createdAt
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
 *         description: Contexts retrieved successfully
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
 *                   example: Contexts fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     contexts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Context'
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new context
 *     description: Create a new context for the authenticated user
 *     tags: [Contexts]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Work
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Work-related tasks and projects
 *               color:
 *                 type: string
 *                 example: '#3B82F6'
 *               icon:
 *                 type: string
 *                 example: briefcase
 *     responses:
 *       201:
 *         description: Context created successfully
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
 *                   example: Context created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Context'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - Context with this name already exists
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
    .get(verifyJWT, getAllContexts)
    .post(verifyJWT, validate(createContextPostValidator), createContext);

/**
 * @swagger
 * /api/v1/contexts/{id}:
 *   get:
 *     summary: Get context by ID
 *     description: Retrieve a specific context by its ID
 *     tags: [Contexts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Context ID
 *     responses:
 *       200:
 *         description: Context retrieved successfully
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
 *                   example: Context fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/Context'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Context not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update context
 *     description: Update an existing context by its ID
 *     tags: [Contexts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Context ID
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
 *                 example: Deep Work
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Updated description
 *               color:
 *                 type: string
 *                 example: '#10B981'
 *               icon:
 *                 type: string
 *                 example: lightning-bolt
 *     responses:
 *       200:
 *         description: Context updated successfully
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
 *                   example: Context updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Context'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Context not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - Context with this name already exists
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
 *     summary: Delete context
 *     description: Soft delete a context by its ID (sets deletedAt timestamp)
 *     tags: [Contexts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Context ID
 *     responses:
 *       200:
 *         description: Context deleted successfully
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
 *                   example: Context deleted successfully
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
 *         description: Context not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
    .route("/:id")
    .get(verifyJWT, getContextById)
    .patch(verifyJWT, validate(updateContextPatchValidator), updateContextById)
    .delete(verifyJWT, deleteContextById);

export default router;