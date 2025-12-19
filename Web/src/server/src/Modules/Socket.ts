import jwt from 'jsonwebtoken'
import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'

import Keys from 'Server/Config/Keys.js'
import User from 'Server/Models/User.js'
import { initMqtt } from 'Server/Modules/Mqtt/index.js'
import { socketInitHandler } from 'Server/Modules/Mqtt/Handler.js'
import WeatherService, { ForcastData } from 'Server/Services/WeatherService.js'

/**
 * Authentication middleware for Socket.io connections.
 * Validates the JWT token provided in the socket handshake.
 *
 * @param socket - The connected socket instance
 * @param next - The next middleware function
 */
const AuthHandler = async (socket: Socket, next: (err?: Error) => void) => {
	const { token = null } = socket.handshake.auth as { token?: string }

	// Validate JWT Token
	if (token) {
		// Split "Bearer <token>" and extract the token value
		const [authType, tokenValue] = token.trim().split(' ')
		console.log(
			'Token: ',
			token,
			'\nAfter split: ',
			authType,
			' - ',
			tokenValue
		)
		if (authType !== 'Bearer' || !tokenValue)
			return next(new Error('no token'))

		try {
			// Verify token and fetch user
			const payload = jwt.verify(tokenValue, Keys.jwt.secret) as {
				id: string
			}
			const id = payload.id.toString()
			const user = await User.findById(id)

			// Check if user exists
			if (!user) return next(new Error('No user found'))
		} catch (err) {
			return next(new Error('Invalid token', { cause: err }))
		}
	} else {
		return next(new Error('No token provided'))
	}

	next()
}

/**
 * Initialize socket server with authentication and MQTT integration.
 *
 * @param server - The HTTPS server instance
 */
const socketInit = (server: HttpServer) => {
	const io = new Server(server, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST'],
		},
	})

	// Setup socket server
	io.use(AuthHandler)
	io.on('connection', (socket: Socket) => {
		socketInitHandler(socket, io)
	})

	// Listen for weather forecast updates and broadcast to all clients
	WeatherService.onWeatherForcastUpdate((data: ForcastData) => {
		io.emit('weather_update', data)
	})

	// Start MQTT when Socket starts
	initMqtt(io)
}

export default socketInit
