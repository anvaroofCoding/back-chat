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
			return res.status(400).json({ message: 'Foydalanuvchi allaqachon mavjud' })
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
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body

		const user = await User.findOne({ email })

		if (!user) {
			return res.status(400).json({ message: 'Foydalanuvchi topilmadi' })
		}

		if (!user.isApproved) {
			return res.status(403).json({ message: 'Hisob hali tasdiqlanmagan' })
		}

		if (!user.password) {
			return res.status(400).json({
				message: 'Bu hisob uchun parol orqali kirish mavjud emas',
			})
		}

		const isMatch = await bcrypt.compare(password, user.password)

		if (!isMatch) {
			return res.status(400).json({ message: 'Parol notogri' })
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
				role: user.isAdmin ? 'admin' : 'user',
			},
		})
	} catch (error) {
		console.error('Login error:', error)
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.logout = async (req, res) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '')

		await Session.updateOne({ token }, { isActive: false })

		res.json({ message: 'Logged out successfully' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.bootstrapAdmin = async (req, res) => {
	try {
		const { firstname, lastname, birthday, email, password, biography, job } =
			req.body

		const existingUser = await User.findOne({ email })
		if (existingUser) {
			return res.status(400).json({ message: 'Foydalanuvchi allaqachon mavjud' })
		}

		const hashedPassword = await bcrypt.hash(password, 10)
		const admin = await User.create({
			firstname,
			lastname,
			birthday,
			email,
			password: hashedPassword,
			biography,
			job,
			isAdmin: true,
			isApproved: true,
		})

		res.status(201).json({
			message: 'Admin created successfully',
			admin: {
				id: admin._id,
				firstname: admin.firstname,
				lastname: admin.lastname,
				birthday: admin.birthday,
				email: admin.email,
				biography: admin.biography,
				job: admin.job,
				avatar: admin.avatar,
				isAdmin: admin.isAdmin,
				isApproved: admin.isApproved,
				isOnline: admin.isOnline,
				lastSeen: admin.lastSeen,
				createdAt: admin.createdAt,
				updatedAt: admin.updatedAt,
			},
		})
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}
