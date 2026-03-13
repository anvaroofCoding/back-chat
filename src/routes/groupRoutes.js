const router = require('express').Router()
const groupController = require('../controllers/groupController')
const authMiddleware = require('../middleware/auth')

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group created
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, groupController.createGroup)

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get user's groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, groupController.getGroups)

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
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
 *         description: Group details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
router.get('/:groupId', authMiddleware, groupController.getGroup)

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Update group (owner only)
 *     tags: [Groups]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Group updated
 *       403:
 *         description: Only owner can update
 *       401:
 *         description: Unauthorized
 */
router.put(
	'/:groupId',
	authMiddleware,
	groupController.uploadAvatar,
	groupController.updateGroup,
)

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Delete group (owner only)
 *     tags: [Groups]
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
 *       403:
 *         description: Only owner can delete
 *       401:
 *         description: Unauthorized
 */
router.delete('/:groupId', authMiddleware, groupController.deleteGroup)

/**
 * @swagger
 * /api/groups/{groupId}/members:
 *   post:
 *     summary: Add member to group (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Member added
 *       403:
 *         description: Only owner can add members
 *       401:
 *         description: Unauthorized
 */
router.post('/:groupId/members', authMiddleware, groupController.addMember)

/**
 * @swagger
 * /api/groups/{groupId}/members/{userId}:
 *   delete:
 *     summary: Remove member from group (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Only owner can remove members
 *       401:
 *         description: Unauthorized
 */
router.delete(
	'/:groupId/members/:userId',
	authMiddleware,
	groupController.removeMember,
)

/**
 * @swagger
 * /api/groups/{groupId}/transfer-ownership:
 *   put:
 *     summary: Transfer group ownership (owner only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerId
 *             properties:
 *               newOwnerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ownership transferred
 *       403:
 *         description: Only owner can transfer
 *       401:
 *         description: Unauthorized
 */
router.put(
	'/:groupId/transfer-ownership',
	authMiddleware,
	groupController.transferOwnership,
)

module.exports = router
