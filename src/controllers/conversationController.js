const Conversation = require('../models/Conversation')
const Message = require('../models/Message')

const attachUnreadCount = async (conversations, currentUser) => {
	const mapped = await Promise.all(
		conversations.map(async conversation => {
			const unreadCount = await Message.countDocuments({
				conversationId: conversation._id,
				is_read: false,
				sender: { $ne: currentUser },
			})

			return {
				...conversation.toObject(),
				unreadCount,
			}
		}),
	)

	return mapped
}

// ─── Private Chat ───────────────────────────────────────────────────────────

// POST /api/conversations/private  { userId }
exports.createPrivateConversation = async (req, res) => {
	try {
		const { userId } = req.body
		const currentUser = req.user.id

		if (userId === currentUser) {
			return res
				.status(400)
				.json({ message: 'Ozingiz bilan chat ochib bolmaydi' })
		}

		const existing = await Conversation.findOne({
			type: 'private',
			members: { $all: [currentUser, userId], $size: 2 },
		})
			.populate('members', 'firstname lastname avatar isOnline')
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})

		if (existing) return res.json(existing)

		const conversation = await Conversation.create({
			type: 'private',
			members: [currentUser, userId],
		})

		await conversation.populate('members', 'firstname lastname avatar isOnline')

		const io = req.app.get('io')
		const convPayload = conversation.toObject()
		io.to(`user:${currentUser}`).emit('conversation:new', convPayload)
		io.to(`user:${userId}`).emit('conversation:new', convPayload)

		res.status(201).json(conversation)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// GET /api/conversations/private
exports.getPrivateConversations = async (req, res) => {
	try {
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin
		const { search, from, to } = req.query

		const filter = { type: 'private' }
		if (!isAdmin) {
			filter.members = { $in: [currentUser] }
		}
		if (from || to) {
			filter.lastMessageAt = {}
			if (from) filter.lastMessageAt.$gte = new Date(from)
			if (to) filter.lastMessageAt.$lte = new Date(to)
		}

		let conversations = await Conversation.find(filter)
			.populate('members', 'firstname lastname avatar isOnline')
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})
			.sort({ lastMessageAt: -1 })

		if (search) {
			const s = search.toLowerCase()
			conversations = conversations.filter(c =>
				c.members.some(
					m =>
						(isAdmin || m._id.toString() !== currentUser) &&
						`${m.firstname} ${m.lastname}`.toLowerCase().includes(s),
				),
			)
		}

		const conversationsWithUnread = await attachUnreadCount(
			conversations,
			currentUser,
		)

		res.json(conversationsWithUnread)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// ─── Group Chat ──────────────────────────────────────────────────────────────

// GET /api/conversations/groups
exports.getGroupConversations = async (req, res) => {
	try {
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin
		const { search, from, to } = req.query

		const filter = { type: 'group' }
		if (!isAdmin) {
			filter.members = { $in: [currentUser] }
		}
		if (from || to) {
			filter.lastMessageAt = {}
			if (from) filter.lastMessageAt.$gte = new Date(from)
			if (to) filter.lastMessageAt.$lte = new Date(to)
		}

		let conversations = await Conversation.find(filter)
			.populate('members', 'firstname lastname avatar isOnline')
			.populate('groupId', 'name description avatar owner')
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})
			.sort({ lastMessageAt: -1 })

		if (search) {
			const s = search.toLowerCase()
			conversations = conversations.filter(
				c => c.groupId && c.groupId.name.toLowerCase().includes(s),
			)
		}

		const conversationsWithUnread = await attachUnreadCount(
			conversations,
			currentUser,
		)

		res.json(conversationsWithUnread)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// ─── Unified Inbox ───────────────────────────────────────────────────────────

// GET /api/conversations
// query: ?type=private|group|all  &search=  &from=  &to=
exports.getConversations = async (req, res) => {
	try {
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin
		const { type, search, from, to } = req.query

		const filter = {}
		if (!isAdmin) {
			filter.members = { $in: [currentUser] }
		}

		if (type === 'private') filter.type = 'private'
		else if (type === 'group') filter.type = 'group'
		// else: both

		if (from || to) {
			filter.lastMessageAt = {}
			if (from) filter.lastMessageAt.$gte = new Date(from)
			if (to) filter.lastMessageAt.$lte = new Date(to)
		}

		let conversations = await Conversation.find(filter)
			.populate('members', 'firstname lastname avatar isOnline')
			.populate('groupId', 'name description avatar owner')
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})
			.sort({ lastMessageAt: -1 })

		if (search) {
			const s = search.toLowerCase()
			conversations = conversations.filter(c => {
				if (c.type === 'group') {
					return c.groupId && c.groupId.name.toLowerCase().includes(s)
				}
				return c.members.some(
					m =>
						(isAdmin || m._id.toString() !== currentUser) &&
						`${m.firstname} ${m.lastname}`.toLowerCase().includes(s),
				)
			})
		}

		const conversationsWithUnread = await attachUnreadCount(
			conversations,
			currentUser,
		)

		res.json(conversationsWithUnread)
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// GET /api/conversations/:conversationId  (single conversation detail)
exports.getConversation = async (req, res) => {
	try {
		const { conversationId } = req.params
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin

		const conversation = await Conversation.findById(conversationId)
			.populate('members', 'firstname lastname avatar isOnline')
			.populate({
				path: 'groupId',
				select: 'name description avatar owner members createdAt updatedAt',
				populate: {
					path: 'owner',
					select:
						'firstname lastname birthday email biography job avatar isApproved isAdmin isOnline lastSeen createdAt updatedAt',
				},
			})
			.populate({
				path: 'lastMessage',
				populate: { path: 'sender', select: 'firstname lastname' },
			})

		if (!conversation)
			return res.status(404).json({ message: 'Suhbat topilmadi' })

		const isMember = conversation.members.some(
			m => m._id.toString() === currentUser,
		)
		if (!isMember && !isAdmin) {
			return res.status(403).json({ message: 'Ruxsat yoq' })
		}

		const unreadCount = await Message.countDocuments({
			conversationId: conversation._id,
			is_read: false,
			sender: { $ne: currentUser },
		})

		res.json({
			...conversation.toObject(),
			unreadCount,
		})
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}

// DELETE /api/conversations/:conversationId  (admin only)
exports.deleteConversation = async (req, res) => {
	try {
		const { conversationId } = req.params

		const conversation = await Conversation.findById(conversationId)
		if (!conversation)
			return res.status(404).json({ message: 'Suhbat topilmadi' })

		const io = req.app.get('io')
		conversation.members.forEach(memberId => {
			io.to(`user:${memberId.toString()}`).emit('conversation:deleted', {
				conversationId,
				deletedAt: new Date().toISOString(),
			})
		})

		await Message.deleteMany({ conversationId })
		await Conversation.findByIdAndDelete(conversationId)

		res.json({ message: 'Conversation and all messages deleted' })
	} catch (error) {
		res.status(500).json({ message: 'Serverda ichki xatolik' })
	}
}
