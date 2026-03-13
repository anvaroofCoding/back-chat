const router = require('express').Router()
const adminController = require('../controllers/adminController')
const authMiddleware = require('../middleware/auth')

const adminMiddleware = (req, res, next) => {
	if (!req.user.isAdmin) {
		return res.status(403).json({ message: 'Admin access required' })
	}
	next()
}

/**
 * @swagger
 * /api/admin/pending-users:
 *   get:
 *     summary: Get pending users for approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending users
 *       403:
 *         description: Admin access required
 */
router.get(
	'/pending-users',
	authMiddleware,
	adminMiddleware,
	adminController.getPendingUsers,
)

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Admin access required
 */
router.get(
	'/users',
	authMiddleware,
	adminMiddleware,
	adminController.getAllUsers,
)

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Update a user (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
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
 *               isApproved:
 *                 type: boolean
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin access required
 */
router.put(
	'/users/:userId',
	authMiddleware,
	adminMiddleware,
	adminController.updateUser,
)

/**
 * @swagger
 * /api/admin/approve/{userId}:
 *   put:
 *     summary: Approve a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User approved
 *       403:
 *         description: Admin access required
 */
router.put(
	'/approve/:userId',
	authMiddleware,
	adminMiddleware,
	adminController.approveUser,
)

/**
 * @swagger
 * /api/admin/reject/{userId}:
 *   delete:
 *     summary: Reject a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User rejected
 *       403:
 *         description: Admin access required
 */
router.delete(
	'/reject/:userId',
	authMiddleware,
	adminMiddleware,
	adminController.rejectUser,
)

module.exports = router
