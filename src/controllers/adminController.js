const User = require('../models/User')
const bcrypt = require('bcryptjs')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const Group = require('../models/Group')

// ─── Users ────────────────────────────────────────────────────────────────────

exports.getPendingUsers = async (req, res) => {
	try {
		const users = await User.find({ isApproved: false }).select('-password')
		res.json(users)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.getAllUsers = async (req, res) => {
	try {
		const users = await User.find().select('-password')
		res.json(users)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.getUser = async (req, res) => {
	try {
		const user = await User.findById(req.params.userId).select('-password')
		if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })
		res.json(user)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
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
		if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })

		const io = req.app.get('io')
		io.to(`user:${userId}`).emit('user:updated', {
			userId,
			...user.toObject(),
		})

		res.json(user)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.deleteUser = async (req, res) => {
	try {
		const io = req.app.get('io')
		io.to(`user:${req.params.userId}`).emit('user:deleted', {
			userId: req.params.userId,
			at: new Date().toISOString(),
		})
		await User.findByIdAndDelete(req.params.userId)
		res.json({ message: 'User deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.approveUser = async (req, res) => {
	try {
		const user = await User.findByIdAndUpdate(
			req.params.userId,
			{ isApproved: true },
			{ new: true },
		).select('-password')

		const io = req.app.get('io')
		io.to(`user:${req.params.userId}`).emit('user:approved', {
			userId: req.params.userId,
			isApproved: true,
			at: new Date().toISOString(),
		})

		res.json(user)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.rejectUser = async (req, res) => {
	try {
		const io = req.app.get('io')
		io.to(`user:${req.params.userId}`).emit('user:rejected', {
			userId: req.params.userId,
			at: new Date().toISOString(),
		})
		await User.findByIdAndDelete(req.params.userId)
		res.json({ message: 'User rejected and deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.createAdmin = async (req, res) => {
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

exports.getAdmins = async (req, res) => {
	try {
		const admins = await User.find({ isAdmin: true }).select('-password')
		res.json(admins)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.getAdminById = async (req, res) => {
	try {
		const admin = await User.findOne({
			_id: req.params.adminId,
			isAdmin: true,
		}).select('-password')

		if (!admin) {
			return res.status(404).json({ message: 'Admin topilmadi' })
		}

		res.json(admin)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.updateAdmin = async (req, res) => {
	try {
		const { adminId } = req.params
		const updateData = { ...req.body }

		if (updateData.password) {
			updateData.password = await bcrypt.hash(updateData.password, 10)
		}

		updateData.isAdmin = true

		const admin = await User.findOneAndUpdate(
			{ _id: adminId, isAdmin: true },
			updateData,
			{
				new: true,
				runValidators: true,
			},
		).select('-password')

		if (!admin) {
			return res.status(404).json({ message: 'Admin topilmadi' })
		}

		res.json(admin)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.deleteAdmin = async (req, res) => {
	try {
		const { adminId } = req.params

		if (req.user.id === adminId) {
			return res.status(400).json({ message: 'Ozingizni ochira olmaysiz' })
		}

		const deletedAdmin = await User.findOneAndDelete({
			_id: adminId,
			isAdmin: true,
		})

		if (!deletedAdmin) {
			return res.status(404).json({ message: 'Admin topilmadi' })
		}

		res.json({ message: 'Admin deleted successfully' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// ─── Conversations ────────────────────────────────────────────────────────────

exports.getAllConversations = async (req, res) => {
	try {
		const { type, search, from, to } = req.query
		const filter = {}
		if (type === 'private' || type === 'group') filter.type = type
		if (from || to) {
			filter.lastMessageAt = {}
			if (from) filter.lastMessageAt.$gte = new Date(from)
			if (to) filter.lastMessageAt.$lte = new Date(to)
		}

		let conversations = await Conversation.find(filter)
			.populate('members', 'firstname lastname avatar')
			.populate('groupId', 'name description avatar')
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})
			.sort({ lastMessageAt: -1 })

		if (search) {
			const s = search.toLowerCase()
			conversations = conversations.filter(c => {
				if (c.type === 'group')
					return c.groupId && c.groupId.name.toLowerCase().includes(s)
				return c.members.some(m =>
					`${m.firstname} ${m.lastname}`.toLowerCase().includes(s),
				)
			})
		}

		res.json(conversations)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.deleteConversation = async (req, res) => {
	try {
		const { conversationId } = req.params
		const conversation = await Conversation.findById(conversationId)
			.select('members')
			.lean()
		if (conversation) {
			const io = req.app.get('io')
			conversation.members.forEach(memberId => {
				io.to(`user:${memberId.toString()}`).emit('conversation:deleted', {
					conversationId,
					deletedAt: new Date().toISOString(),
				})
			})
		}
		await Message.deleteMany({ conversationId })
		await Conversation.findByIdAndDelete(conversationId)
		res.json({ message: 'Conversation and all messages deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// ─── Messages ─────────────────────────────────────────────────────────────────

exports.getAllMessages = async (req, res) => {
	try {
		const { conversationId } = req.query
		const filter = conversationId ? { conversationId } : {}
		const messages = await Message.find(filter)
			.populate('sender', 'firstname lastname avatar')
			.populate('conversationId', 'type')
			.populate({
				path: 'replyTo',
				select: 'text files audio video createdAt sender',
				populate: { path: 'sender', select: 'firstname lastname avatar' },
			})
			.sort({ createdAt: -1 })
		res.json(messages)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.adminDeleteMessage = async (req, res) => {
	try {
		await Message.findByIdAndDelete(req.params.messageId)
		res.json({ message: 'Message deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.adminEditMessage = async (req, res) => {
	try {
		const message = await Message.findByIdAndUpdate(
			req.params.messageId,
			{ text: req.body.text },
			{ new: true },
		)
			.populate('sender', 'firstname lastname avatar')
			.populate({
				path: 'replyTo',
				select: 'text files audio video createdAt sender',
				populate: { path: 'sender', select: 'firstname lastname avatar' },
			})
		if (!message) return res.status(404).json({ message: 'Xabar topilmadi' })
		res.json(message)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// ─── Groups ───────────────────────────────────────────────────────────────────

exports.getAllGroups = async (req, res) => {
	try {
		const groups = await Group.find()
			.populate('owner', 'firstname lastname')
			.populate('members', 'firstname lastname avatar')
		res.json(groups)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.adminUpdateGroup = async (req, res) => {
	try {
		const group = await Group.findByIdAndUpdate(req.params.groupId, req.body, {
			new: true,
		})
		if (!group) return res.status(404).json({ message: 'Guruh topilmadi' })
		res.json(group)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

exports.adminDeleteGroup = async (req, res) => {
	try {
		const { groupId } = req.params
		const conversation = await Conversation.findOne({ groupId })
		if (conversation) {
			await Message.deleteMany({ conversationId: conversation._id })
			await Conversation.findByIdAndDelete(conversation._id)
		}
		await Group.findByIdAndDelete(groupId)
		res.json({ message: 'Group, conversation and messages deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}
