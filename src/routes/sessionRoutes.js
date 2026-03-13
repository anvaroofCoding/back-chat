const express = require('express')
const router = express.Router()
const sessionController = require('../controllers/sessionController')
const auth = require('../middleware/auth')

/**
 * @swagger
 * /api/sessions/{userId}:
 *   get:
 *     summary: Get active sessions for a user
 *     tags: [Sessions]
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
 *         description: List of active sessions
 *       403:
 *         description: Access denied
 */
router.get('/:userId', auth, sessionController.getActiveSessions)

/**
 * @swagger
 * /api/sessions/{sessionId}/logout:
 *   post:
 *     summary: Logout from a specific session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       403:
 *         description: Access denied
 */
router.post('/:sessionId/logout', auth, sessionController.logoutSession)

/**
 * @swagger
 * /api/sessions/logout-others:
 *   post:
 *     summary: Logout from all other sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from other sessions
 */
router.post('/logout-others', auth, sessionController.logoutOtherSessions)

module.exports = router
