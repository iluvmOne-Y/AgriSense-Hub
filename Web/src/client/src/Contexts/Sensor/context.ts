import React from 'react'

import type { SensorContextValueType } from './index.js'

/**
 * Default values for the Sensor context.
 */
export const DEFAULT: SensorContextValueType = {
	selectedPlant: null,
	availablePlants: [],
	isAutoMode: false,
	isPumpActive: false,
	thresholds: null,

	currentReadings: null,
	recordHistory: [],

	onPlantChange: () => {},
	onAutoToggle: () => {},
	onPumpToggle: () => {},
}

/**
 * Context for managing sensor-related state and actions.
 */
const SensorContext = React.createContext(DEFAULT)

export default SensorContext
