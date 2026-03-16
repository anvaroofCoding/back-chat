const User = require('../models/User')
const multer = require('multer')
const path = require('path')

// Configure multer for avatar upload
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/')
	},
	filename: (req, file, cb) => {
		cb(
			null,
			Date.now() +
				'-' +
				Math.round(Math.random() * 1e9) +
				path.extname(file.originalname),
		)
	},
})

const upload = multer({ storage })

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

exports.uploadAvatar = upload.single('avatar')

exports.getUsers = async (req, res) => {
	try {
		const { search, email, firstname, lastname } = req.query
		const filter = {}
		const orConditions = []

		if (typeof search === 'string' && search.trim()) {
			const searchRegex = new RegExp(escapeRegex(search.trim()), 'i')
			orConditions.push(
				{ email: searchRegex },
				{ firstname: searchRegex },
				{ lastname: searchRegex },
			)
		}

		if (typeof email === 'string' && email.trim()) {
			filter.email = new RegExp(escapeRegex(email.trim()), 'i')
		}

		if (typeof firstname === 'string' && firstname.trim()) {
			filter.firstname = new RegExp(escapeRegex(firstname.trim()), 'i')
		}

		if (typeof lastname === 'string' && lastname.trim()) {
			filter.lastname = new RegExp(escapeRegex(lastname.trim()), 'i')
		}

		if (orConditions.length > 0) {
			filter.$or = orConditions
		}

		const users = await User.find(filter)
			.select('-password')
			.sort({ firstname: 1, lastname: 1 })
		res.json(users)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getUserProfileById = async (req, res) => {
	try {
		const user = await User.findById(req.params.userId).select('-password')

		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select('-password')
		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.updateProfile = async (req, res) => {
	try {
		const { firstname, lastname, birthday, biography, job } = req.body
		const updateData = { firstname, lastname, birthday, biography, job }

		if (req.file) {
			const baseUrl = `${req.protocol}://${req.get('host')}`
			updateData.avatar = `${baseUrl}/uploads/${req.file.filename}`
		}

		const user = await User.findByIdAndUpdate(req.user.id, updateData, {
			new: true,
		}).select('-password')
		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}
