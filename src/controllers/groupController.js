const Group = require('../models/Group')
const Conversation = require('../models/Conversation')
const User = require('../models/User')
const multer = require('multer')
const path = require('path')

// Configure multer for group avatar
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

exports.createGroup = async (req, res) => {
	try {
		const { name, description } = req.body
		const owner = req.user.id

		const group = await Group.create({
			name,
			description,
			owner,
			members: [owner], // owner is also a member
		})

		// Create conversation for the group
		const conversation = await Conversation.create({
			type: 'group',
			members: [owner],
			groupId: group._id,
		})

		res.json({ group, conversation })
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getGroups = async (req, res) => {
	try {
		const userId = req.user.id
		const groups = await Group.find({ members: { $in: [userId] } }).populate(
			'owner',
			'firstname lastname',
		)
		res.json(groups)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const group = await Group.findById(groupId)
			.populate('owner', 'firstname lastname')
			.populate('members', 'firstname lastname email')
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		res.json(group)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.updateGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const { name, description } = req.body
		const userId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		if (group.owner.toString() !== userId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Only owner or admin can update group' })
		}

		const updateData = { name, description }
		if (req.file) {
			const baseUrl = `${req.protocol}://${req.get('host')}`
			updateData.avatar = `${baseUrl}/uploads/${req.file.filename}`
		}

		const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, {
			new: true,
		})
		res.json(updatedGroup)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.deleteGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const userId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		if (group.owner.toString() !== userId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Only owner or admin can delete group' })
		}

		await Group.findByIdAndDelete(groupId)
		// Also delete related conversation
		await Conversation.findOneAndDelete({ groupId })
		res.json({ message: 'Group deleted' })
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.addMember = async (req, res) => {
	try {
		const { groupId } = req.params
		const { userId } = req.body
		const ownerId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		if (group.owner.toString() !== ownerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Only owner or admin can add members' })
		}

		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		if (group.members.includes(userId)) {
			return res.status(400).json({ message: 'User already in group' })
		}

		group.members.push(userId)
		await group.save()

		// Update conversation members
		await Conversation.findOneAndUpdate(
			{ groupId },
			{ $addToSet: { members: userId } },
		)

		res.json(group)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.removeMember = async (req, res) => {
	try {
		const { groupId, userId } = req.params
		const ownerId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		if (group.owner.toString() !== ownerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Only owner or admin can remove members' })
		}

		group.members = group.members.filter(id => id.toString() !== userId)
		await group.save()

		// Update conversation members
		await Conversation.findOneAndUpdate(
			{ groupId },
			{ $pull: { members: userId } },
		)

		res.json(group)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.transferOwnership = async (req, res) => {
	try {
		const { groupId } = req.params
		const { newOwnerId } = req.body
		const currentOwnerId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Group not found' })
		}
		if (group.owner.toString() !== currentOwnerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Only owner or admin can transfer ownership' })
		}

		const newOwner = await User.findById(newOwnerId)
		if (!newOwner) {
			return res.status(404).json({ message: 'New owner not found' })
		}

		// If new owner not in group, add them
		if (!group.members.includes(newOwnerId)) {
			group.members.push(newOwnerId)
			await Conversation.findOneAndUpdate(
				{ groupId },
				{ $addToSet: { members: newOwnerId } },
			)
		}

		group.owner = newOwnerId
		await group.save()

		res.json(group)
	} catch (error) {
		res.status(500).json(error)
	}
}
