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
	const currentHostSpec = {
		...specs,
		servers: [
			{
				url: `${req.protocol}://${req.get('host')}`,
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
		const userId = payload.userId || payload.id || null
		const firstname = payload.firstname || ''
		const lastname = payload.lastname || ''
		const fullName =
			`${firstname} ${lastname}`.trim() || payload.name || 'Unknown'
		return { userId, fullname: fullName, avatar: payload.avatar || null }
	}

	const resolveConversationId = payload => {
		if (!payload) return null
		if (typeof payload === 'string') return payload
		if (typeof payload === 'object') {
			return payload.conversationId || payload.roomId || null
		}
		return null
	}

	socket.on('join_conversation', payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		const participant = resolveParticipant(payload)
		if (participant) socket.data.participant = participant

		socket.join(conversationId)
		socket.data.activeConversations.add(conversationId)
		console.log(`User joined conversation ${conversationId}`)
	})

	socket.on('leave_conversation', payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		socket.leave(conversationId)
		socket.data.activeConversations.delete(conversationId)

		socket.to(conversationId).emit('typing_stop', {
			conversationId,
			user: socket.data.participant || null,
			at: new Date().toISOString(),
		})
	})

	socket.on('typing_start', payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		const participant =
			resolveParticipant(payload) || socket.data.participant || null
		socket.to(conversationId).emit('typing_start', {
			conversationId,
			user: participant,
			at: new Date().toISOString(),
		})
	})

	socket.on('typing_stop', payload => {
		const conversationId = resolveConversationId(payload)
		if (!conversationId) return

		const participant =
			resolveParticipant(payload) || socket.data.participant || null
		socket.to(conversationId).emit('typing_stop', {
			conversationId,
			user: participant,
			at: new Date().toISOString(),
		})
	})

	socket.on('send_message', data => {
		if (!data || !data.conversationId) return
		socket.to(data.conversationId).emit('receive_message', data)
		socket.to(data.conversationId).emit('message:new', data)
	})

	socket.on('disconnect', () => {
		if (
			socket.data.activeConversations &&
			socket.data.activeConversations.size > 0
		) {
			for (const conversationId of socket.data.activeConversations) {
				socket.to(conversationId).emit('typing_stop', {
					conversationId,
					user: socket.data.participant || null,
					at: new Date().toISOString(),
				})
			}
		}
		console.log('User disconnected')
	})
})

// MongoDB
mongoose
	.connect('mongodb://localhost:27017/chatapp')
	.then(() => console.log('MongoDB connected'))
	.catch(err => console.log(err))

const PORT = process.env.PORT || 5000

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on port ${PORT}`)
	console.log(`Local access: http://localhost:${PORT}`)
	console.log(`Network access: http://88.88.150.150:${PORT}`)
})
