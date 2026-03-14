const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			enum: ['private', 'group'],
			default: 'private',
		},
		members: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		groupId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Group',
		},
		lastMessage: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message',
		},
		lastMessageAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Conversation', conversationSchema)
