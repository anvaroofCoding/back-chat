const router = require('express').Router()
const messageController = require('../controllers/messageController')
const authMiddleware = require('../middleware/auth')

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation (for 1-on-1 or group)
 *               groupId:
 *                 type: string
 *                 description: ID of the group (alternative to conversationId)
 *               text:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Message sent
 *       401:
 *         description: Unauthorized
 */
router.post(
	'/',
	authMiddleware,
	messageController.uploadFiles,
	messageController.sendMessage,
)

/**
 * @swagger
 * /api/messages/{conversationId}:
 *   get:
 *     summary: Get messages in conversation
 *     tags: [Messages]
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
 *         description: List of messages
 *       401:
 *         description: Unauthorized
 */
router.get('/:conversationId', authMiddleware, messageController.getMessages)

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
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
 *       403:
 *         description: Access denied
 */
router.delete('/:messageId', authMiddleware, messageController.deleteMessage)

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
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
 *         description: Message edited
 *       403:
 *         description: Access denied
 */
router.put('/:messageId', authMiddleware, messageController.editMessage)

module.exports = router
