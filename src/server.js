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
app.use(cors())
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
		servers: [
			{
				url: 'http://localhost:5000',
			},
		],
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

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

	socket.on('join_conversation', conversationId => {
		socket.join(conversationId)
		console.log(`User joined conversation ${conversationId}`)
	})

	socket.on('send_message', data => {
		// This can be used for real-time sending, but since we send via API, maybe not needed
		socket.to(data.conversationId).emit('receive_message', data)
	})

	socket.on('disconnect', () => {
		console.log('User disconnected')
	})
})

// MongoDB
mongoose
	.connect('mongodb://localhost:27017/chatapp')
	.then(() => console.log('MongoDB connected'))
	.catch(err => console.log(err))

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
