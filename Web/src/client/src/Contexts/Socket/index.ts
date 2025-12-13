import type { Socket } from 'socket.io-client'

import SocketContext from './context.js'
import SocketProvider from './provider.js'
import useSocket from './hook.js'

/**
 * Interface defining the Socket Context State and Actions.
 *
 * @property {Socket | null} socket - The active Socket.io instance.
 * @property {boolean} connected - True if the socket is currently connected to the server.
 * @property {() => void} connect - Function to manually initiate connection (usually handled automatically).
 * @property {() => void} disconnect - Function to manually close the connection.
 */
export type SocketContextValueType = {
	socket: Socket | null
	connected: boolean

	connect: () => void
	disconnect: () => void
}

export { SocketContext, SocketProvider, useSocket }
