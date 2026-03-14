const router = require('express').Router()
const a = require('../controllers/adminController')
const auth = require('../middleware/auth')

const adminOnly = (req, res, next) => {
	if (!req.user.isAdmin)
		return res.status(403).json({ message: 'Admin access required' })
	next()
}

const guard = [auth, adminOnly]

// ─── Users ────────────────────────────────────────────────────────────────────

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
 *         description: List of users
 */
router.get('/users', ...guard, a.getAllUsers)

/**
 * @swagger
 * /api/admin/users/pending:
 *   get:
 *     summary: Get pending (unapproved) users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending users
 */
router.get('/users/pending', ...guard, a.getPendingUsers)

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Get single user
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
 *         description: User detail
 */
router.get('/users/:userId', ...guard, a.getUser)

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Update any user
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
 *               isApproved:
 *                 type: boolean
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/users/:userId', ...guard, a.updateUser)

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user
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
 *         description: User deleted
 */
router.delete('/users/:userId', ...guard, a.deleteUser)

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
 */
router.put('/approve/:userId', ...guard, a.approveUser)

/**
 * @swagger
 * /api/admin/reject/{userId}:
 *   delete:
 *     summary: Reject and delete a user
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
 */
router.delete('/reject/:userId', ...guard, a.rejectUser)

// ─── Conversations ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/conversations:
 *   get:
 *     summary: Get all conversations (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [private, group]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/conversations', ...guard, a.getAllConversations)

/**
 * @swagger
 * /api/admin/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation and all messages (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/conversations/:conversationId', ...guard, a.deleteConversation)

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/messages:
 *   get:
 *     summary: Get all messages (admin). Filter by conversationId using query param.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/messages', ...guard, a.getAllMessages)

/**
 * @swagger
 * /api/admin/messages/{messageId}:
 *   put:
 *     summary: Edit any message (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 */
router.put('/messages/:messageId', ...guard, a.adminEditMessage)

/**
 * @swagger
 * /api/admin/messages/{messageId}:
 *   delete:
 *     summary: Delete any message (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
router.delete('/messages/:messageId', ...guard, a.adminDeleteMessage)

// ─── Groups ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/groups:
 *   get:
 *     summary: Get all groups (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all groups
 */
router.get('/groups', ...guard, a.getAllGroups)

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   put:
 *     summary: Update any group (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group updated
 */
router.put('/groups/:groupId', ...guard, a.adminUpdateGroup)

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   delete:
 *     summary: Delete a group with all messages (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 */
router.delete('/groups/:groupId', ...guard, a.adminDeleteGroup)

module.exports = router
