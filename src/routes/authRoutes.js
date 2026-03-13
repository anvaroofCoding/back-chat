const router = require('express').Router()
const authController = require('../controllers/authController')

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - birthday
 *               - email
 *               - password
 *               - biography
 *               - job
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               birthday:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               biography:
 *                 type: string
 *               job:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
router.post('/register', authController.register)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstname:
 *                       type: string
 *                     lastname:
 *                       type: string
 *                     birthday:
 *                       type: string
 *                       format: date
 *                     email:
 *                       type: string
 *                     biography:
 *                       type: string
 *                     job:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', authController.login)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout)

/**
 * @swagger
 * /api/auth:
 *   get:
 *     summary: Get auth API info
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Auth endpoints info
 */
router.get('/', (req, res) => {
	res.json({ message: 'Auth API endpoints: POST /register, POST /login' })
})

module.exports = router
