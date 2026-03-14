const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
	{
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Conversation',
		},
		replyTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Message',
			default: null,
		},
		text: String,
		files: [
			{
				url: String,
				filename: String,
				mimetype: String,
			},
		],
		audio: {
			url: String,
			filename: String,
			mimetype: String,
		},
		video: [
			{
				url: String,
				filename: String,
				mimetype: String,
			},
		],
		is_read: {
			type: Boolean,
			default: false,
		},
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Message', messageSchema)
