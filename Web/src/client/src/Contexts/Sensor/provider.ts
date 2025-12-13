import React, { createElement, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

import { MAX_SENSOR_RECORD_STORE } from 'Shared/Data/Constants/index.js'
import type {
	SensorData,
	SensorUpdate,
	SensorRecordType,
	SafeThresholds,
	PlantProfileType,
} from 'Shared/Data/Types/index.js'
import { usePage } from 'Client/Contexts/Page/index.js'
import { useSocket } from 'Client/Contexts/Socket/index.js'

import SensorContext from './context.js'

/**
 * Provider for the Sensor context.
 * Manages state for plant profiles, automation, and device controls via socket.
 *
 * @param children - The child components that will have access to the SensorContext.
 * @return The Sensor context provider component.
 */
const SensorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { dispatch, notify } = usePage()
	const { socket } = useSocket()

	// State for plant profiles and automation
	const [isAutoMode, setIsAutoMode] = useState<boolean>(false)
	const [isPumpActive, setIsPumpActive] = useState<boolean>(false)
	const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
	const [availablePlants, setAvailablePlants] = useState<string[]>([])
	const [thresholds, setThresholds] = useState<SafeThresholds | null>(null)

	// State for sensor data
	const [currentReadings, setCurrentReadings] = useState<SensorData | null>(
		null
	)
	const [recordHistory, setRecordHistory] = useState<SensorRecordType[]>([])

	// Set up socket event listeners
	useEffect(() => {
		if (!socket) return

		// Listen for initial historical sensor records
		socket.on('initial_records', (records: any[]) => {
			const normalizedRecords: SensorRecordType[] = records.map(
				(rec) => ({
					data: rec.data,
					timestamp: new Date(rec.timestamp),
				})
			)

			// Sort records by timestamp ascending
			const sortedRecords = normalizedRecords.sort(
				(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
			)

			// Set records if any exist
			if (records.length > 0) {
				setRecordHistory(sortedRecords)
				setCurrentReadings(
					normalizedRecords[sortedRecords.length - 1].data
				)
			}
		})

		// Listen for real-time sensor updates
		socket.on(
			'sensor_update',
			(response: { success: boolean; data: SensorUpdate }) => {
				if (
					response.success &&
					response.data &&
					response.data.sensorData
				) {
					const newData = response.data.sensorData
					setCurrentReadings(newData)

					const newRecord: SensorRecordType = {
						data: newData,
						timestamp: new Date(),
					}

					// Update history while maintaining the max record store limit
					setRecordHistory((prev) => {
						const updated = [...prev, newRecord]
						return updated.slice(-MAX_SENSOR_RECORD_STORE)
					})
				}
			}
		)

		// Listen for current system state for proper initialization
		socket.on(
			'system_state',
			(data: {
				state: {
					pump: boolean
					automode: boolean
				}
				currentPlantType?: string
				currentPlantProfile?: PlantProfileType
			}) => {
				setIsPumpActive(data.state.pump)
				setIsAutoMode(data.state.automode)

				if (data.currentPlantType && data.currentPlantProfile) {
					setSelectedPlant(data.currentPlantType)
					setThresholds(data.currentPlantProfile.safeThresholds)
				}
			}
		)

		// Listen for available plant profiles
		socket.on('available_plants', (plants: string[]) => {
			setAvailablePlants(plants)
		})

		// Listen for pump state updates
		socket.on('pump_state_update', (enable: boolean) =>
			setIsPumpActive(enable)
		)

		// Listen for auto mode state updates
		socket.on('auto_state_update', (enable: boolean) =>
			setIsAutoMode(enable)
		)

		// Listen for plant type updates to update thresholds
		socket.on(
			'plant_type_update',
			(data: { plantType: string; thresholds: SafeThresholds }) => {
				setSelectedPlant(data.plantType)
				setThresholds(data.thresholds)

				// Notify user of plant profile change
				notify('success', `Profile loaded: ${data.plantType}`, 5)
			}
		)

		// Listen for command acknowledgments to show errors
		socket.on(
			'command_ack',
			(res: { success: boolean; message: string }) => {
				if (!res.success) {
					notify('error', res.message, 5)
				} else {
					notify('info', res.message, 5)
				}
			}
		)

		return () => {
			socket.off('initial_records')
			socket.off('sensor_update')
			socket.off('system_state')
			socket.off('available_plants')
			socket.off('pump_state_update')
			socket.off('auto_state_update')
			socket.off('plant_type_update')
			socket.off('command_ack')
		}
	}, [socket, dispatch])

	/**
	 * Toggles the pump state manually.
	 */
	const onPumpToggle = useCallback(() => {
		const newState = !isPumpActive
		socket?.emit('pump', newState)
	}, [isPumpActive, socket])

	/**
	 * Toggles the auto mode state.
	 *
	 * @param e - Input change event from the toggle switch.
	 */
	const onAutoToggle = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newState = e.target.checked
			socket?.emit('toggle_auto_mode', newState)
		},
		[socket]
	)

	/**
	 * Changes the active plant profile.
	 *
	 * @param e - Select change event from the dropdown.
	 */
	const onPlantChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const newPlant = e.target.value.toString()
			socket?.emit('change_plant_type', newPlant)
		},
		[socket]
	)

	return createElement(
		SensorContext.Provider,
		{
			value: {
				selectedPlant,
				availablePlants,
				isAutoMode,
				isPumpActive,
				thresholds,

				currentReadings,
				recordHistory,

				onPlantChange,
				onAutoToggle,
				onPumpToggle,
			},
		},
		children
	)
}

export default SensorProvider
