// Profile Routes - defines API endpoints for profile operations
import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { authMiddleware } from '../../../shared/middleware/auth';
import { rateLimiter } from '../../../shared/middleware/rateLimiter';

const router = Router();
const profileController = new ProfileController();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateProfileRequest:
 *       type: object
 *       required:
 *         - personalInfo
 *         - location
 *         - landDetails
 *       properties:
 *         personalInfo:
 *           $ref: '#/components/schemas/PersonalInfo'
 *         location:
 *           $ref: '#/components/schemas/LocationData'
 *         landDetails:
 *           $ref: '#/components/schemas/LandDetails'
 *         financialProfile:
 *           $ref: '#/components/schemas/FinancialProfile'
 *         preferences:
 *           $ref: '#/components/schemas/FarmingPreferences'
 */

/**
 * @swagger
 * /api/v1/profiles:
 *   post:
 *     summary: Create a new farmer profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProfileRequest'
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile created successfully
 *                 data:
 *                   $ref: '#/components/schemas/ProfileResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Profile already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, rateLimiter, profileController.createProfile);

/**
 * @swagger
 * /api/v1/profiles/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me', authMiddleware, profileController.getProfile);

/**
 * @swagger
 * /api/v1/profiles/me:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               personalInfo:
 *                 $ref: '#/components/schemas/PersonalInfo'
 *               location:
 *                 $ref: '#/components/schemas/LocationData'
 *               landDetails:
 *                 $ref: '#/components/schemas/LandDetails'
 *               financialProfile:
 *                 $ref: '#/components/schemas/FinancialProfile'
 *               preferences:
 *                 $ref: '#/components/schemas/FarmingPreferences'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/ProfileResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/me', authMiddleware, rateLimiter, profileController.updateProfile);

/**
 * @swagger
 * /api/v1/profiles/me:
 *   delete:
 *     summary: Delete current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Profile deletion not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/me', authMiddleware, profileController.deleteProfile);

/**
 * @swagger
 * /api/v1/profiles/me/completeness:
 *   get:
 *     summary: Get profile completeness details
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completeness retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile completeness retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       example: 75
 *                     completedSections:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Personal Information", "Location Details"]
 *                     missingSections:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Financial Profile", "Farming Preferences"]
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           section:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           description:
 *                             type: string
 *                           estimatedTimeMinutes:
 *                             type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me/completeness', authMiddleware, profileController.getProfileCompleteness);

export default router;