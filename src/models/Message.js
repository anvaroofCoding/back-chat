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
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Message', messageSchema)
