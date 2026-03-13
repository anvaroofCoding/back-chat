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

exports.uploadAvatar = upload.single('avatar')

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
			updateData.avatar = `/uploads/${req.file.filename}`
		}

		const user = await User.findByIdAndUpdate(req.user.id, updateData, {
			new: true,
		}).select('-password')
		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}
