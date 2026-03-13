const Message = require('../models/Message')
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
])

exports.sendMessage = async (req, res) => {
	try {
		const { conversationId, groupId, text } = req.body
		const sender = req.user.id

		let targetConversationId = conversationId

		if (groupId) {
			// Find conversation for the group
			const Conversation = require('../models/Conversation')
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

		const messageData = {
			sender,
			conversationId: targetConversationId,
			text,
		}

		if (req.files && req.files.files && req.files.files.length > 0) {
			messageData.files = req.files.files.map(file => ({
				url: `/uploads/${file.filename}`,
				filename: file.originalname,
				mimetype: file.mimetype,
			}))
		}

		if (req.files && req.files.audio && req.files.audio.length > 0) {
			const audioFile = req.files.audio[0]
			messageData.audio = {
				url: `/uploads/${audioFile.filename}`,
				filename: audioFile.originalname,
				mimetype: audioFile.mimetype,
			}
		}

		const message = await Message.create(messageData)

		// Emit to socket
		const io = req.app.get('io')
		io.to(conversationId).emit('receive_message', message)

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
		res.json(message)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getMessages = async (req, res) => {
	try {
		const { conversationId } = req.params

		const messages = await Message.find({ conversationId })
			.populate('sender', 'firstname lastname')
			.sort({ createdAt: 1 })

		res.json(messages)
	} catch (error) {
		res.status(500).json(error)
	}
}
