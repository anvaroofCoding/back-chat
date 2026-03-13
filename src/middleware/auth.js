const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Session = require('../models/Session')

module.exports = async (req, res, next) => {
	const token = req.header('Authorization')?.replace('Bearer ', '')

	if (!token) {
		return res.status(401).json({ message: 'No token provided' })
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET)

		// Check if session exists and is active
		const session = await Session.findOne({ token, isActive: true })
		if (!session) {
			return res.status(401).json({ message: 'Session expired or invalid' })
		}

		// Load important user flags so we can enforce admin/approved status
		const user = await User.findById(decoded.id).select('isAdmin isApproved')

		if (!user) {
			return res.status(401).json({ message: 'Invalid token' })
		}

		req.user = {
			id: decoded.id,
			isAdmin: user.isAdmin,
			isApproved: user.isApproved,
		}

		next()
	} catch (error) {
		res.status(401).json({ message: 'Invalid token' })
	}
}
