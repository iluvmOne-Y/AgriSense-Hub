import React from 'react'

import SensorContext from './context.js'

/**
 * Hook to access the Sensor context.
 *
 * @return The Sensor context value.
 */
export default function useSensor() {
	return React.useContext(SensorContext)
}
