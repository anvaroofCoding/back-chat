const router = require('express').Router()
const c = require('../controllers/conversationController')
const auth = require('../middleware/auth')

const adminOnly = (req, res, next) => {
	if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin only' })
	next()
}

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: "Unified inbox: all conversations (private + group) sorted by latest message"
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [private, group, all]
 *         description: Filter by conversation type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or group name
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: List of conversations sorted by lastMessageAt desc
 */
router.get('/', auth, c.getConversations)

/**
 * @swagger
 * /api/conversations/private:
 *   post:
 *     summary: Start or get a private 1-on-1 conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Existing conversation returned
 *       201:
 *         description: New conversation created
 */
router.post('/private', auth, c.createPrivateConversation)

/**
 * @swagger
 * /api/conversations/private:
 *   get:
 *     summary: Get only private (1-on-1) conversations
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of private conversations
 */
router.get('/private', auth, c.getPrivateConversations)

/**
 * @swagger
 * /api/conversations/groups:
 *   get:
 *     summary: Get only group conversations
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of group conversations
 */
router.get('/groups', auth, c.getGroupConversations)

/**
 * @swagger
 * /api/conversations/{conversationId}:
 *   get:
 *     summary: Get a single conversation by ID
 *     tags: [Conversations]
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
 *         description: Conversation detail
 *       403:
 *         description: Access denied
 */
router.get('/:conversationId', auth, c.getConversation)

/**
 * @swagger
 * /api/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation and all its messages (admin only)
 *     tags: [Conversations]
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
 *         description: Deleted successfully
 *       403:
 *         description: Admin only
 */
router.delete('/:conversationId', auth, adminOnly, c.deleteConversation)

module.exports = router
