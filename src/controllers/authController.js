const User = require('../models/User')
const Session = require('../models/Session')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req, res) => {
	try {
		const { firstname, lastname, birthday, email, password, biography, job } =
			req.body

		const existingUser = await User.findOne({ email })

		if (existingUser) {
			return res.status(400).json({ message: 'User already exists' })
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		const user = await User.create({
			firstname,
			lastname,
			birthday,
			email,
			password: hashedPassword,
			biography,
			job,
		})

		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body

		const user = await User.findOne({ email })

		if (!user) {
			return res.status(400).json({ message: 'User not found' })
		}

		if (!user.isApproved) {
			return res.status(403).json({ message: 'Account not approved yet' })
		}

		const isMatch = await bcrypt.compare(password, user.password)

		if (!isMatch) {
			return res.status(400).json({ message: 'Wrong password' })
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: '365d',
		})

		// Create session
		const session = await Session.create({
			userId: user._id,
			token,
			deviceInfo: {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
			},
		})

		res.json({
			token,
			user: {
				id: user._id,
				firstname: user.firstname,
				lastname: user.lastname,
				birthday: user.birthday,
				email: user.email,
				biography: user.biography,
				job: user.job,
				avatar: user.avatar,
				isApproved: user.isApproved,
				isAdmin: user.isAdmin,
			},
		})
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.logout = async (req, res) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '')

		await Session.updateOne({ token }, { isActive: false })

		res.json({ message: 'Logged out successfully' })
	} catch (error) {
		res.status(500).json(error)
	}
}
