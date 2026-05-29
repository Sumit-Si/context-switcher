import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getAnalytics,
  getSummary,
  getHeatmap,
  getTopContexts,
  getAvgFocusByContext,
  getSwitchPatterns,
  getStreak,
} from "../controllers/analytics.controller";

const router = Router();

/**
 * @swagger
 * /api/v1/analytics:
 *   get:
 *     summary: Get analytics data
 *     description: Retrieve analytics data for a specific time range (day, week, month, all)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, all]
 *           default: week
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                   example: Analytics computed successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid time range
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
 */
router.route("/").get(verifyJWT, getAnalytics);

/**
 * @swagger
 * /api/v1/analytics/summary:
 *   get:
 *     summary: Get summary statistics
 *     description: Retrieve summary statistics for today, this week, and this month including total switches, average focus quality, and ritual completion rate
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary statistics retrieved successfully
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
 *                   example: Summary statistics fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: object
 *                       properties:
 *                         totalSwitches:
 *                           type: integer
 *                           example: 5
 *                         avgFocusQuality:
 *                           type: number
 *                           example: 4.2
 *                         ritualCompletionRate:
 *                           type: number
 *                           example: 80.0
 *                     thisWeek:
 *                       type: object
 *                       properties:
 *                         totalSwitches:
 *                           type: integer
 *                           example: 35
 *                         avgFocusQuality:
 *                           type: number
 *                           example: 4.1
 *                         ritualCompletionRate:
 *                           type: number
 *                           example: 75.5
 *                     thisMonth:
 *                       type: object
 *                       properties:
 *                         totalSwitches:
 *                           type: integer
 *                           example: 150
 *                         avgFocusQuality:
 *                           type: number
 *                           example: 4.0
 *                         ritualCompletionRate:
 *                           type: number
 *                           example: 78.3
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/summary").get(verifyJWT, getSummary);

/**
 * @swagger
 * /api/v1/analytics/heatmap:
 *   get:
 *     summary: Get heatmap data
 *     description: Retrieve switch counts grouped by hour and day of week for visualization
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Heatmap data retrieved successfully
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
 *                   example: Heatmap data fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hour:
 *                         type: integer
 *                         example: 9
 *                         description: Hour of day (0-23)
 *                       dayOfWeek:
 *                         type: integer
 *                         example: 2
 *                         description: Day of week (1=Sunday, 7=Saturday)
 *                       count:
 *                         type: integer
 *                         example: 12
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/heatmap").get(verifyJWT, getHeatmap);

/**
 * @swagger
 * /api/v1/analytics/top-contexts:
 *   get:
 *     summary: Get top contexts
 *     description: Retrieve top 5 most used and least used contexts based on total time spent
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top contexts retrieved successfully
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
 *                   example: Top contexts fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     mostUsed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           contextId:
 *                             type: string
 *                             example: 507f1f77bcf86cd799439011
 *                           contextName:
 *                             type: string
 *                             example: Work
 *                           totalTimeMinutes:
 *                             type: integer
 *                             example: 1200
 *                           switchCount:
 *                             type: integer
 *                             example: 45
 *                     leastUsed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           contextId:
 *                             type: string
 *                             example: 507f1f77bcf86cd799439012
 *                           contextName:
 *                             type: string
 *                             example: Exercise
 *                           totalTimeMinutes:
 *                             type: integer
 *                             example: 60
 *                           switchCount:
 *                             type: integer
 *                             example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/top-contexts").get(verifyJWT, getTopContexts);

/**
 * @swagger
 * /api/v1/analytics/avg-focus:
 *   get:
 *     summary: Get average focus by context
 *     description: Retrieve average focus quality for each context
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Average focus by context retrieved successfully
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
 *                   example: Average focus by context fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       contextId:
 *                         type: string
 *                         example: 507f1f77bcf86cd799439011
 *                       contextName:
 *                         type: string
 *                         example: Deep Work
 *                       avgFocus:
 *                         type: number
 *                         example: 4.5
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/avg-focus").get(verifyJWT, getAvgFocusByContext);

/**
 * @swagger
 * /api/v1/analytics/switch-patterns:
 *   get:
 *     summary: Get switch patterns
 *     description: Retrieve top 10 most common context switch patterns (from context → to context transitions)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Switch patterns retrieved successfully
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
 *                   example: Switch patterns fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fromContext:
 *                         type: string
 *                         example: Work
 *                       toContext:
 *                         type: string
 *                         example: Break
 *                       count:
 *                         type: integer
 *                         example: 25
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/switch-patterns").get(verifyJWT, getSwitchPatterns);

/**
 * @swagger
 * /api/v1/analytics/streak:
 *   get:
 *     summary: Get ritual completion streak
 *     description: Retrieve current and longest streak of consecutive days with completed rituals
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streak data retrieved successfully
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
 *                   example: Streak data fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentStreak:
 *                       type: integer
 *                       example: 7
 *                       description: Current consecutive days with completed rituals
 *                     longestStreak:
 *                       type: integer
 *                       example: 21
 *                       description: Longest streak ever achieved
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/streak").get(verifyJWT, getStreak);

export default router;
