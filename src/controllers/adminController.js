const User = require('../models/User')
const bcrypt = require('bcryptjs')

exports.getPendingUsers = async (req, res) => {
	try {
		const users = await User.find({ isApproved: false }).select('-password')
		res.json(users)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find().select('-password')
		res.json(users)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.updateUser = async (req, res) => {
	try {
		const { userId } = req.params
		const updateData = { ...req.body }

		if (updateData.password) {
			updateData.password = await bcrypt.hash(updateData.password, 10)
		}

		const user = await User.findByIdAndUpdate(userId, updateData, {
			new: true,
			runValidators: true,
		}).select('-password')

		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.approveUser = async (req, res) => {
	try {
		const { userId } = req.params
		const user = await User.findByIdAndUpdate(
			userId,
			{ isApproved: true },
			{ new: true },
		).select('-password')
		res.json(user)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.rejectUser = async (req, res) => {
	try {
		const { userId } = req.params
		await User.findByIdAndDelete(userId)
		res.json({ message: 'User rejected and deleted' })
	} catch (error) {
		res.status(500).json(error)
	}
}
