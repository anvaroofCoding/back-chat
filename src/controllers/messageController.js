const Message = require('../models/Message')
const Conversation = require('../models/Conversation')
const multer = require('multer')
const path = require('path')

// Configure multer for file uploads
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

exports.uploadFiles = upload.fields([
	{ name: 'files', maxCount: 10 },
	{ name: 'audio', maxCount: 1 },
	{ name: 'video', maxCount: 5 }, // Allow up to 5 videos
])

exports.sendMessage = async (req, res) => {
	try {
		const { conversationId, groupId, text, replyTo } = req.body
		const sender = req.user.id

		let targetConversationId = conversationId

		if (groupId) {
			// Find conversation for the group
			const conversation = await Conversation.findOne({ groupId })
			if (conversation) {
				targetConversationId = conversation._id
			} else {
				return res.status(404).json({ message: 'Group conversation not found' })
			}
		}

		if (!targetConversationId) {
			return res
				.status(400)
				.json({ message: 'conversationId or groupId is required' })
		}

		let replyToMessageId = null
		if (replyTo) {
			const repliedMessage = await Message.findById(replyTo)
			if (!repliedMessage) {
				return res
					.status(404)
					.json({ message: 'Reply target message not found' })
			}

			if (
				repliedMessage.conversationId.toString() !==
				targetConversationId.toString()
			) {
				return res.status(400).json({
					message: 'Reply target message must belong to the same conversation',
				})
			}

			replyToMessageId = repliedMessage._id
		}

		const messageData = {
			sender,
			conversationId: targetConversationId,
			text,
			replyTo: replyToMessageId,
		}

		const baseUrl = `${req.protocol}://${req.get('host')}`

		if (req.files && req.files.files && req.files.files.length > 0) {
			messageData.files = req.files.files.map(file => ({
				url: `${baseUrl}/uploads/${file.filename}`,
				filename: file.originalname,
				mimetype: file.mimetype,
			}))
		}

		if (req.files && req.files.audio && req.files.audio.length > 0) {
			const audioFile = req.files.audio[0]
			messageData.audio = {
				url: `${baseUrl}/uploads/${audioFile.filename}`,
				filename: audioFile.originalname,
				mimetype: audioFile.mimetype,
			}
		}

		if (req.files && req.files.video && req.files.video.length > 0) {
			messageData.video = req.files.video.map(file => ({
				url: `${baseUrl}/uploads/${file.filename}`,
				filename: file.originalname,
				mimetype: file.mimetype,
			}))
		}

		const message = await Message.create(messageData)
		await message.populate('sender', 'firstname lastname avatar')
		await message.populate({
			path: 'replyTo',
			select: 'text files audio video createdAt sender',
			populate: { path: 'sender', select: 'firstname lastname avatar' },
		})

		// Update conversation lastMessage + lastMessageAt
		await Conversation.findByIdAndUpdate(targetConversationId, {
			lastMessage: message._id,
			lastMessageAt: message.createdAt,
		})

		// Emit to socket
		const io = req.app.get('io')
		io.to(targetConversationId.toString()).emit('receive_message', message)
		io.to(targetConversationId.toString()).emit('message:new', message)

		res.json(message)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.deleteMessage = async (req, res) => {
	try {
		const { messageId } = req.params
		const userId = req.user.id
		const isAdmin = req.user.isAdmin

		const message = await Message.findById(messageId).populate({
			path: 'conversationId',
			populate: { path: 'groupId', select: 'owner' },
		})
		if (!message) {
			return res.status(404).json({ message: 'Message not found' })
		}

		const isSender = message.sender.toString() === userId
		const isGroupOwner =
			message.conversationId.groupId &&
			message.conversationId.groupId.owner.toString() === userId

		if (!isSender && !isAdmin && !isGroupOwner) {
			return res.status(403).json({
				message: 'Only sender, group owner, or admin can delete message',
			})
		}

		await Message.findByIdAndDelete(messageId)

		const io = req.app.get('io')
		io.to(message.conversationId._id.toString()).emit('message:deleted', {
			messageId,
			conversationId: message.conversationId._id,
			deletedBy: userId,
			deletedAt: new Date().toISOString(),
		})
		io.to(message.conversationId._id.toString()).emit('message_deleted', {
			messageId,
			conversationId: message.conversationId._id,
			deletedBy: userId,
			deletedAt: new Date().toISOString(),
		})

		res.json({ message: 'Message deleted' })
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.editMessage = async (req, res) => {
	try {
		const { messageId } = req.params
		const { text } = req.body
		const userId = req.user.id
		const isAdmin = req.user.isAdmin

		const message = await Message.findById(messageId).populate({
			path: 'conversationId',
			populate: { path: 'groupId', select: 'owner' },
		})
		if (!message) {
			return res.status(404).json({ message: 'Message not found' })
		}

		const isSender = message.sender.toString() === userId
		const isGroupOwner =
			message.conversationId.groupId &&
			message.conversationId.groupId.owner.toString() === userId

		if (!isSender && !isAdmin && !isGroupOwner) {
			return res.status(403).json({
				message: 'Only sender, group owner, or admin can edit message',
			})
		}

		message.text = text
		await message.save()

		const io = req.app.get('io')
		const conversationId = message.conversationId._id.toString()
		const payload = {
			messageId: message._id,
			conversationId: message.conversationId._id,
			text: message.text,
			editedBy: userId,
			editedAt: new Date().toISOString(),
		}
		io.to(conversationId).emit('message:updated', payload)
		io.to(conversationId).emit('message_edited', payload)

		res.json(message)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getMessages = async (req, res) => {
	try {
		const { conversationId } = req.params
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin

		// verify access
		const conversation = await Conversation.findById(conversationId)
		if (!conversation)
			return res.status(404).json({ message: 'Conversation not found' })

		const isMember = conversation.members.some(
			m => m.toString() === currentUser,
		)
		if (!isMember && !isAdmin) {
			return res.status(403).json({ message: 'Access denied' })
		}

		const messages = await Message.find({ conversationId })
			.populate('sender', 'firstname lastname avatar')
			.populate({
				path: 'replyTo',
				select: 'text files audio video createdAt sender',
				populate: { path: 'sender', select: 'firstname lastname avatar' },
			})
			.sort({ createdAt: 1 })

		res.json(messages)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.markMessageAsRead = async (req, res) => {
	try {
		const { messageId } = req.params
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin

		const message = await Message.findById(messageId).populate('conversationId')
		if (!message) return res.status(404).json({ message: 'Message not found' })

		const isMember = message.conversationId.members.some(
			m => m.toString() === currentUser,
		)
		if (!isMember && !isAdmin) {
			return res.status(403).json({ message: 'Access denied' })
		}

		if (!message.is_read || !message.read) {
			message.is_read = true
			message.read = true
			await message.save()

			const io = req.app.get('io')
			io.to(message.conversationId._id.toString()).emit('message:read', {
				messageId: message._id,
				conversationId: message.conversationId._id,
				is_read: true,
				readBy: currentUser,
				readAt: new Date().toISOString(),
			})
		}

		res.json(message)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.markConversationAsRead = async (req, res) => {
	try {
		const { conversationId } = req.params
		const currentUser = req.user.id
		const isAdmin = req.user.isAdmin

		const conversation = await Conversation.findById(conversationId)
		if (!conversation)
			return res.status(404).json({ message: 'Conversation not found' })

		const isMember = conversation.members.some(
			m => m.toString() === currentUser,
		)
		if (!isMember && !isAdmin) {
			return res.status(403).json({ message: 'Access denied' })
		}

		const unreadMessages = await Message.find({
			conversationId,
			is_read: false,
			sender: { $ne: currentUser },
		}).select('_id')

		if (unreadMessages.length > 0) {
			await Message.updateMany(
				{ _id: { $in: unreadMessages.map(m => m._id) } },
				{ $set: { is_read: true, read: true } },
			)

			const io = req.app.get('io')
			io.to(conversationId.toString()).emit('conversation:read', {
				conversationId,
				messageIds: unreadMessages.map(m => m._id),
				is_read: true,
				readBy: currentUser,
				readAt: new Date().toISOString(),
			})
		}

		res.json({
			message: 'Conversation messages marked as read',
			updatedCount: unreadMessages.length,
		})
	} catch (error) {
		res.status(500).json(error)
	}
}
