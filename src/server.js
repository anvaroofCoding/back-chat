const express = require('express')
const { Server } = require('socket.io')
const http = require('http')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const authRoutes = require('./routes/authRoutes')
const conversationRoutes = require('./routes/conversationRoutes')
const messageRoutes = require('./routes/messageRoutes')
const userRoutes = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes')
const groupRoutes = require('./routes/groupRoutes')
const sessionRoutes = require('./routes/sessionRoutes')

const app = express()
app.set('trust proxy', 1)

// middleware
app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
)
app.use(express.json())
app.use('/uploads', express.static('uploads'))

// routes
app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/sessions', sessionRoutes)

const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Chat App API',
			version: '1.0.0',
			description: 'Real-time chat application with file uploads',
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
		},
	},
	apis: ['./src/routes/*.js'],
}

const specs = swaggerJsdoc(options)
app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
	const forwardedProto = req.headers['x-forwarded-proto']
	const protocol = (forwardedProto || req.protocol || 'http')
		.toString()
		.split(',')[0]
		.trim()
	const host = req.get('host')
	const currentHostSpec = {
		...specs,
		servers: [
			{
				url: `${protocol}://${host}`,
				description: 'Current server',
			},
		],
	}
	return swaggerUi.setup(currentHostSpec)(req, res, next)
})

app.get('/', (req, res) => {
	res.send('Chat API running')
})

const server = http.createServer(app)

// socket.io
const io = new Server(server, {
	cors: {
		origin: '*',
	},
})

// Make io accessible in routes
app.set('io', io)

io.on('connection', socket => {
	console.log('User connected')
	socket.data.activeConversations = new Set()

	const resolveParticipant = payload => {
		if (!payload || typeof payload !== 'object') return null
		const source =
			payload.user && typeof payload.user === 'object' ? payload.user : payload
		const userId =
			source.userId ||
			source.id ||
			source._id ||
			payload.userId ||
			payload.id ||
			payload._id ||
			null
		const firstname = source.firstname || payload.firstname || ''
		const lastname = source.lastname || payload.lastname || ''
		const fullName =
			`${firstname} ${lastname}`.trim() ||
			source.name ||
			payload.name ||
			'Unknown'
		return {
			userId,
			fullname: fullName,
			avatar: source.avatar || payload.avatar || null,
		}
	}

	const normalizeId = value => {
		if (!value) return null
		if (typeof value === 'string' || typeof value === 'number') {
			return String(value)
		}
		if (typeof value === 'object') {
			if (value._id) return String(value._id)
			if (value.id) return String(value.id)
		}
		return null
	}

	const resolveConversationId = payload => {
		if (!payload) return null
		if (typeof payload === 'string' || typeof payload === 'number') {
			return String(payload)
		}
		if (typeof payload === 'object') {
			return (
				normalizeId(payload.conversationId) ||
				normalizeId(payload.roomId) ||
				normalizeId(payload.chatId) ||
				normalizeId(payload.id) ||
				normalizeId(payload._id) ||
				null
			)
		}
		return null
	}

	const ensureJoined = conversationId => {
		const roomId = normalizeId(conversationId)
		if (!roomId) return
		socket.join(roomId)
		socket.data.activeConversations.add(roomId)
	}

	const emitTypingStart = (conversationId, participant) => {
		const payload = {
			conversationId,
			user: participant,
			at: new Date().toISOString(),
		}
		socket.to(conversationId).emit('typing_start', payload)
		socket.to(conversationId).emit('typing:start', payload)
		socket.to(conversationId).emit('user_typing', payload)
	}

	const emitTypingStop = (conversationId, participant) => {
		const payload = {
			conversationId,
			user: participant,
			at: new Date().toISOString(),
		}
		socket.to(conversationId).emit('typing_stop', payload)
		socket.to(conversationId).emit('typing:stop', payload)
		socket.to(conversationId).emit('user_stop_typing', payload)
	}

	const emitMessageNew = messagePayload => {
		const conversationId = resolveConversationId(messagePayload)
		if (!conversationId) return
		ensureJoined(conversationId)
		socket.to(conversationId).emit('receive_message', messagePayload)
		socket.to(conversationId).emit('message:new', messagePayload)
		socket.to(conversationId).emit('new_message', messagePayload)
		socket.to(conversationId).emit('message', messagePayload)
	}

	const handleJoinConversation = payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		const participant = resolveParticipant(payload)
		if (participant) socket.data.participant = participant

		ensureJoined(conversationId)
		socket.emit('joined_conversation', {
			conversationId,
			at: new Date().toISOString(),
		})
		console.log(`User joined conversation ${conversationId}`)
	}

	const handleLeaveConversation = payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		socket.leave(conversationId)
		socket.data.activeConversations.delete(conversationId)
		emitTypingStop(conversationId, socket.data.participant || null)
	}

	const handleTypingStart = payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return
		ensureJoined(conversationId)

		const participant =
			resolveParticipant(payload) || socket.data.participant || null
		emitTypingStart(conversationId, participant)
	}

	const handleTypingStop = payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return
		ensureJoined(conversationId)

		const participant =
			resolveParticipant(payload) || socket.data.participant || null
		emitTypingStop(conversationId, participant)
	}

	const handleSendMessage = data => {
		const messagePayload =
			data && typeof data === 'object' && data.message ? data.message : data
		if (!messagePayload) return
		emitMessageNew(messagePayload)
	}

	socket.on('join_conversation', handleJoinConversation)
	socket.on('join_room', handleJoinConversation)
	socket.on('joinRoom', handleJoinConversation)

	socket.on('leave_conversation', handleLeaveConversation)
	socket.on('leave_room', handleLeaveConversation)
	socket.on('leaveRoom', handleLeaveConversation)

	socket.on('typing_start', handleTypingStart)
	socket.on('typing:start', handleTypingStart)
	socket.on('typing', handleTypingStart)

	socket.on('typing_stop', handleTypingStop)
	socket.on('typing:stop', handleTypingStop)
	socket.on('stop_typing', handleTypingStop)

	socket.on('send_message', handleSendMessage)
	socket.on('message:new', handleSendMessage)
	socket.on('new_message', handleSendMessage)
	socket.on('message:send', handleSendMessage)

	socket.on('disconnect', () => {
		if (
			socket.data.activeConversations &&
			socket.data.activeConversations.size > 0
		) {
			for (const conversationId of socket.data.activeConversations) {
				emitTypingStop(conversationId, socket.data.participant || null)
			}
		}
		console.log('User disconnected')
	})
})

// MongoDB
mongoose
	.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp')
	.then(() => console.log('MongoDB connected'))
	.catch(err => console.log(err))

const PORT = process.env.PORT || 5000

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on port ${PORT}`)
	console.log(`Local access: http://localhost:${PORT}`)
	console.log(`Network access: http://88.88.150.150:${PORT}`)
})
