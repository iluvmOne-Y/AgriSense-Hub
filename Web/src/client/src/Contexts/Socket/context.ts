import React from 'react'

import type { SocketContextValueType } from './index.js'

/**
 * Default values for the SocketContext.
 */
export const DEFAULT: SocketContextValueType = {
	socket: null,
	connected: false,

	connect: () => {},
	disconnect: () => {},
}

/**
 * Context for managing WebSocket connections.
 */
const SocketContext = React.createContext(DEFAULT)

export default SocketContext
