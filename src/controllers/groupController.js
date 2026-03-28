const Group = require('../models/Group')
const Conversation = require('../models/Conversation')
const User = require('../models/User')
const mongoose = require('mongoose')
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

		const io = req.app.get('io')
		io.to(`user:${owner}`).emit('group:created', { group, conversation })

		res.json({ group, conversation })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.getGroups = async (req, res) => {
	try {
		const userId = req.user.id
		const isAdmin = req.user.isAdmin
		const filter = isAdmin ? {} : { members: { $in: [userId] } }
		const groups = await Group.find(filter).populate(
			'owner',
			'firstname lastname',
		)
		res.json(groups)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.getGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const group = await Group.findById(groupId)
			.populate('owner', 'firstname lastname')
			.populate('members', 'firstname lastname email')
		if (!group) {
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		res.json(group)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
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
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		if (group.owner.toString() !== userId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Guruhni faqat egasi yoki admin yangilay oladi' })
		}

		const updateData = { name, description }
		if (req.file) {
			const baseUrl = `${req.protocol}://${req.get('host')}`
			updateData.avatar = `${baseUrl}/uploads/${req.file.filename}`
		}

		const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, {
			new: true,
		})

		const io = req.app.get('io')
		const updConv = await Conversation.findOne({ groupId }).select('_id').lean()
		if (updConv) {
			io.to(updConv._id.toString()).emit('group:updated', updatedGroup)
		}

		res.json(updatedGroup)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.deleteGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const userId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		if (group.owner.toString() !== userId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Guruhni faqat egasi yoki admin ochira oladi' })
		}

		const io = req.app.get('io')
		const delConv = await Conversation.findOne({ groupId: group._id })
			.select('_id')
			.lean()
		if (delConv) {
			io.to(delConv._id.toString()).emit('group:deleted', {
				groupId,
				deletedAt: new Date().toISOString(),
			})
		}
		group.members.forEach(memberId => {
			io.to(`user:${memberId.toString()}`).emit('group:deleted', {
				groupId,
				deletedAt: new Date().toISOString(),
			})
		})

		await Group.findByIdAndDelete(groupId)
		// Also delete related conversation
		await Conversation.findOneAndDelete({ groupId })
		res.json({ message: 'Group deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.addMember = async (req, res) => {
	try {
		const { groupId } = req.params
		const { userId, userIds } = req.body
		const ownerId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		if (group.owner.toString() !== ownerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Azo qoshishni faqat egasi yoki admin bajaradi' })
		}

		const rawUserIds = []
		if (typeof userId === 'string' && userId.trim()) {
			rawUserIds.push(userId.trim())
		}
		if (Array.isArray(userIds)) {
			for (const id of userIds) {
				if (typeof id === 'string' && id.trim()) {
					rawUserIds.push(id.trim())
				}
			}
		}

		const uniqueUserIds = [...new Set(rawUserIds)]
		if (uniqueUserIds.length === 0) {
			return res.status(400).json({
				message:
					'userId yoki userIds[] da kamida bitta foydalanuvchi ID sini yuboring',
			})
		}

		const invalidIds = uniqueUserIds.filter(
			id => !mongoose.Types.ObjectId.isValid(id),
		)
		if (invalidIds.length > 0) {
			return res.status(400).json({
				message: 'Ayrim foydalanuvchi ID lari notogri',
				invalidUserIds: invalidIds,
			})
		}

		const foundUsers = await User.find({ _id: { $in: uniqueUserIds } }).select(
			'_id',
		)
		const foundUserIdSet = new Set(foundUsers.map(user => user._id.toString()))
		const missingUserIds = uniqueUserIds.filter(id => !foundUserIdSet.has(id))
		if (missingUserIds.length > 0) {
			return res.status(404).json({
				message: 'Ayrim foydalanuvchilar topilmadi',
				missingUserIds,
			})
		}

		const existingMemberIds = new Set(group.members.map(id => id.toString()))
		const userIdsToAdd = uniqueUserIds.filter(id => !existingMemberIds.has(id))

		if (userIdsToAdd.length === 0) {
			return res.status(400).json({
				message: 'Berilgan foydalanuvchilarning barchasi allaqachon guruhda',
			})
		}

		group.members.push(...userIdsToAdd)
		await group.save()

		// Update conversation members
		await Conversation.findOneAndUpdate(
			{ groupId },
			{ $addToSet: { members: { $each: userIdsToAdd } } },
		)

		const io = req.app.get('io')
		const addConv = await Conversation.findOne({ groupId }).select('_id').lean()
		if (addConv) {
			const roomId = addConv._id.toString()
			io.to(roomId).emit('group:member_added', {
				groupId,
				addedUserIds: userIdsToAdd,
				addedBy: ownerId,
				at: new Date().toISOString(),
			})
			userIdsToAdd.forEach(uid => {
				io.to(`user:${uid}`).emit('conversation:new', {
					conversationId: addConv._id,
					groupId,
				})
			})
		}

		res.json({
			message: 'Members added successfully',
			addedCount: userIdsToAdd.length,
			addedUserIds: userIdsToAdd,
			group,
		})
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.removeMember = async (req, res) => {
	try {
		const { groupId, userId } = req.params
		const ownerId = req.user.id
		const isAdmin = req.user.isAdmin

		const group = await Group.findById(groupId)
		if (!group) {
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		if (group.owner.toString() !== ownerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Azoni faqat egasi yoki admin olib tashlay oladi' })
		}

		group.members = group.members.filter(id => id.toString() !== userId)
		await group.save()

		// Update conversation members
		const remConv = await Conversation.findOne({ groupId: group._id })
			.select('_id')
			.lean()
		await Conversation.findOneAndUpdate(
			{ groupId },
			{ $pull: { members: userId } },
		)

		const io = req.app.get('io')
		if (remConv) {
			io.to(remConv._id.toString()).emit('group:member_removed', {
				groupId,
				removedUserId: userId,
				removedBy: ownerId,
				at: new Date().toISOString(),
			})
		}
		io.to(`user:${userId}`).emit('group:kicked', {
			groupId,
			at: new Date().toISOString(),
		})

		res.json(group)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
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
			return res.status(404).json({ message: 'Guruh topilmadi' })
		}
		if (group.owner.toString() !== currentOwnerId && !isAdmin) {
			return res
				.status(403)
				.json({ message: 'Egalikni faqat egasi yoki admin otkaza oladi' })
		}

		const newOwner = await User.findById(newOwnerId)
		if (!newOwner) {
			return res.status(404).json({ message: 'Yangi egasi topilmadi' })
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

		const io = req.app.get('io')
		const ownConv = await Conversation.findOne({ groupId: group._id })
			.select('_id')
			.lean()
		if (ownConv) {
			io.to(ownConv._id.toString()).emit('group:updated', group)
		}
		io.to(`user:${newOwnerId}`).emit('group:ownership_transferred', {
			groupId: group._id,
			newOwnerId,
			at: new Date().toISOString(),
		})

		res.json(group)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}
