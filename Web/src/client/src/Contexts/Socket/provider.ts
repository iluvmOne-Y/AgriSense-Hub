import io, { Socket } from 'socket.io-client'
import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	createElement,
	type ReactNode,
} from 'react'

import { SOCKET_URL } from 'Client/Data/Constants.js'
import SocketContext from './context.js'
import { useAuth } from 'Client/Contexts/Authentication/index.js'

/**
 * Provider for the SocketContext.
 *
 * @param props - Props containing child components to wrap.
 * @return The SocketContext provider component.
 */
const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { isAuthenticated } = useAuth()
	const token = useRef(localStorage.getItem('token'))

	const socket = useRef<Socket | null>(null)
	const [connected, setConnected] = useState(false)

	// Update token ref on authentication state changes
	useEffect(() => {
		token.current = localStorage.getItem('token')
	}, [isAuthenticated])

	// Manage socket connection based on authentication state
	useEffect(() => {
		if (isAuthenticated) {
			connect()
		} else {
			disconnect()
		}
	}, [isAuthenticated])

	/**
	 * Establishes a new socket connection using the current JWT token.
	 */
	const connect = useCallback(() => {
		// Prevent multiple connections or connecting without a token
		if (socket.current?.connected || !token.current) return

		// Initialize socket client
		socket.current = io(SOCKET_URL, {
			auth: { token: `Bearer ${token.current}` },
			transports: ['websocket'],
			reconnection: true,
			reconnectionAttempts: 5,
		})

		// Setup Event Listeners
		socket.current.on('connect', () => {
			console.log('Socket Connected:', socket.current?.id)
			setConnected(true)
		})

		socket.current.on('disconnect', () => {
			console.log('Socket Disconnected')
			setConnected(false)
		})

		socket.current.on('connect_error', (err) => {
			console.error('Socket Connection Error:', err)
		})
	}, [])

	/**
	 * Disconnects the socket if it is active.
	 */
	const disconnect = useCallback(() => {
		if (socket.current) {
			socket.current.disconnect()
			socket.current = null
			setConnected(false)
		}
	}, [])

	return createElement(
		SocketContext.Provider,
		{
			value: {
				socket: socket.current,
				connected,
				connect,
				disconnect,
			},
		},
		children
	)
}

export default SocketProvider
