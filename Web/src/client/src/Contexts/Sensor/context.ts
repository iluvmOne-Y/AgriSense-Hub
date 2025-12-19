import React from 'react'

import type { SensorContextValueType } from './index.js'

/**
 * Default values for the Sensor context.
 */
export const DEFAULT: SensorContextValueType = {
	isAutoMode: false,
	isPumpActive: false,

	availablePlants: [],
	selectedPlant: null,
	thresholds: null,

	rainProbability: null,

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
