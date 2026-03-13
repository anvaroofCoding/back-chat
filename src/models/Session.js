const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		token: {
			type: String,
			required: true,
		},
		deviceInfo: {
			ip: String,
			userAgent: String,
			device: String, // e.g., 'Desktop', 'Mobile'
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Session', sessionSchema)
