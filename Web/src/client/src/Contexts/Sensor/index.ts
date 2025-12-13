import React from 'react'

import type {
	SafeThresholds,
	SensorData,
	SensorRecordType,
} from 'Shared/Data/Types/index.js'

import SensorContext from './context.js'
import SensorProvider from './provider.js'
import useSensor from './hook.js'

/**
 * Type definition for the Sensor context value.
 *
 * @property selectedPlant - The currently selected plant type.
 * @property availablePlants - List of available plants with their IDs and types.
 * @property isAutoMode - Indicates if the system is in automatic mode.
 * @property isPumpActive - Indicates if the water pump is currently active.
 * @property thresholds - The safe thresholds for the selected plant.
 * @property currentReadings - The latest sensor data readings.
 * @property recordHistory - Historical sensor data records.
 * @property onPlantChange - Handler for changing the selected plant.
 * @property onAutoToggle - Handler for toggling automatic mode.
 * @property onPumpToggle - Handler for toggling the water pump state.
 */
export type SensorContextValueType = {
	selectedPlant: string | null
	availablePlants: string[]
	isAutoMode: boolean
	isPumpActive: boolean
	thresholds: SafeThresholds | null

	currentReadings: SensorData | null
	recordHistory: SensorRecordType[]

	onPlantChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
	onAutoToggle: (e: React.ChangeEvent<HTMLInputElement>) => void
	onPumpToggle: () => void
}

export { SensorContext, SensorProvider, useSensor }
