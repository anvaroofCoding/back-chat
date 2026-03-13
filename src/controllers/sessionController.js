const Session = require('../models/Session')
const User = require('../models/User')

// Get active sessions for a user (user can see own, admin can see any)
exports.getActiveSessions = async (req, res) => {
	try {
		const { userId } = req.params

		// Check if user is admin or requesting own sessions
		if (!req.user.isAdmin && req.user.id !== userId) {
			return res.status(403).json({ message: 'Access denied' })
		}

		const sessions = await Session.find({ userId, isActive: true }).populate(
			'userId',
			'firstname lastname email',
		)

		res.json(sessions)
	} catch (error) {
		res.status(500).json(error)
	}
}

// Logout from a specific session (user can logout own sessions, admin can logout any)
exports.logoutSession = async (req, res) => {
	try {
		const { sessionId } = req.params

		const session = await Session.findById(sessionId)

		if (!session) {
			return res.status(404).json({ message: 'Session not found' })
		}

		// Check if user is admin or owns the session
		if (!req.user.isAdmin && session.userId.toString() !== req.user.id) {
			return res.status(403).json({ message: 'Access denied' })
		}

		session.isActive = false
		await session.save()

		res.json({ message: 'Logged out from session' })
	} catch (error) {
		res.status(500).json(error)
	}
}

// Logout from all other sessions (keep current one)
exports.logoutOtherSessions = async (req, res) => {
	try {
		const currentToken = req.header('Authorization')?.replace('Bearer ', '')

		await Session.updateMany(
			{ userId: req.user.id, token: { $ne: currentToken }, isActive: true },
			{ isActive: false },
		)

		res.json({ message: 'Logged out from other sessions' })
	} catch (error) {
		res.status(500).json(error)
	}
}
