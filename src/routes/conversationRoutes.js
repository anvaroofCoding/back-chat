const router = require('express').Router()
const conversationController = require('../controllers/conversationController')
const authMiddleware = require('../middleware/auth') // need to create this

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
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
 *         description: Conversation created
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, conversationController.createConversation)

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, conversationController.getConversations)

module.exports = router
