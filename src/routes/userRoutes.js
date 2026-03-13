const router = require('express').Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/auth')

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

module.exports = router
