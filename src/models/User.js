const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
	{
		firstname: {
			type: String,
			required: true,
		},
		lastname: {
			type: String,
			required: true,
		},
		birthday: {
			type: Date,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
		},
		biography: {
			type: String,
			required: true,
		},
		job: {
			type: String,
			required: true,
		},
		avatar: String, // profile image URL

		isApproved: {
			type: Boolean,
			default: false,
		},

		isAdmin: {
			type: Boolean,
			default: false,
		},

		isOnline: {
			type: Boolean,
			default: false,
		},

		lastSeen: Date,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
