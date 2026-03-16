const router = require('express').Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/auth')

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (public) with search
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across email, firstname, lastname
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (partial, case-insensitive)
 *       - in: query
 *         name: firstname
 *         schema:
 *           type: string
 *         description: Filter by firstname (partial, case-insensitive)
 *       - in: query
 *         name: lastname
 *         schema:
 *           type: string
 *         description: Filter by lastname (partial, case-insensitive)
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/', userController.getUsers)

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get a user profile by ID (public)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               birthday:
 *                 type: string
 *                 format: date
 *               biography:
 *                 type: string
 *               job:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authMiddleware, userController.getProfile)
router.put(
	'/profile',
	authMiddleware,
	userController.uploadAvatar,
	userController.updateProfile,
)

router.get('/:userId', userController.getUserProfileById)

module.exports = router
