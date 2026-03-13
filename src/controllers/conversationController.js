const Conversation = require('../models/Conversation')

exports.createConversation = async (req, res) => {
	try {
		const { userId } = req.body
		const currentUser = req.user.id // assuming middleware sets req.user

		// Check if conversation already exists
		const existingConversation = await Conversation.findOne({
			members: { $all: [currentUser, userId] },
		})

		if (existingConversation) {
			return res.json(existingConversation)
		}

		const conversation = await Conversation.create({
			members: [currentUser, userId],
		})

		res.json(conversation)
	} catch (error) {
		res.status(500).json(error)
	}
}

exports.getConversations = async (req, res) => {
	try {
		const currentUser = req.user.id

		const conversations = await Conversation.find({
			members: { $in: [currentUser] },
		})
			.populate('members', 'firstname lastname email avatar')
			.populate('groupId', 'name description avatar')

		res.json(conversations)
	} catch (error) {
		res.status(500).json(error)
	}
}
