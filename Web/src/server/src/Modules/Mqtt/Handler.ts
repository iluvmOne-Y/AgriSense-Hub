import { Server, Socket } from 'socket.io'
import chalk from 'chalk'

import { IoTAction, IoTDeviceState } from 'Shared/Data/Constants/index.js'
import {
	PlantProfileType,
	SensorRecordType,
	SensorUpdate,
	DeviceStateUpdate,
} from 'Shared/Data/Types/index.js'
import { publishToDevice } from './index.js'
import { MAX_SENSOR_RECORD_STORE } from 'Shared/Data/Constants/consts_IoT.js'
import SensorRecord from 'Server/Models/SensorRecord.js'
import PlantProfile from 'Server/Models/PlantProfile.js'

/**
 * Manager to store device state and latest data from the device
 *
 * @prop PlantManager
 * @property latestSensorRecords - Array to store the latest sensor data
 * @property currentPlantType - The currently selected plant type
 * @property currentPlantProfile - The profile of the current plant type
 * @property state - The current state of the device (auto mode, pump active)
 */
export const PlantManager = {
	latestSensorRecords: new Array<SensorRecordType>(),
	currentPlantType: null as string | null,
	currentPlantProfile: null as PlantProfileType | null,

	state: {
		auto: true,
		pumpActive: false,
	},
}

/**
 * Initialize the MQTT handler by loading the latest sensor updates from the database.
 * This function fetches the most recent sensor updates from MongoDB
 * and populates the in-memory store for quick access.
 */
export const initHandler = async () => {
	// Load latest sensor updates from database if needed
	try {
		// Fetch the most recent sensor records from MongoDB
		const records: SensorRecordType[] = await SensorRecord.find()
			.sort({ timestamp: -1 })
			.limit(MAX_SENSOR_RECORD_STORE)
			.lean()
			.exec()

		// The records are sorted newest to oldest, so reverse them to push oldest first
		records.reverse().forEach((record) => {
			PlantManager.latestSensorRecords.push(record)
		})

		console.log(
			`${chalk.green('✓')} Loaded ${PlantManager.latestSensorRecords.length} historical sensor records.`
		)

		// Fetch all plant profiles from the database
		const plantProfiles = await PlantProfile.find({}).lean().exec()

		// Default to the first plant profile if available
		if (plantProfiles.length > 0) {
			PlantManager.currentPlantType = plantProfiles[0].plantType
			PlantManager.currentPlantProfile = plantProfiles[0]
		}

		console.log(
			`${chalk.green('✓')} Loaded current plant profile for type: ${PlantManager.currentPlantType}.`
		)
	} catch (err) {
		console.error(
			`${chalk.red('✗ Server: Failed to load latest sensor updates from database:')}`,
			err
		)
	}
}

/**
 * Handle IoT-related socket events for a connected user.
 * Also sends the currently stored sensor data to the newly connected client.
 *
 * @param io - The Socket.io server instance
 * @param socket - The connected user's socket
 */
export const iotHandler = async (socket: Socket, io: Server) => {
	// Send the latest sensor records and system state to the newly connected client
	socket.emit('initial_records', PlantManager.latestSensorRecords)
	socket.emit('system_state', {
		state: {
			pump: PlantManager.state.pumpActive,
			automode: PlantManager.state.auto,
		},
		currentPlantType: PlantManager.currentPlantType,
		currentPlantProfile: PlantManager.currentPlantProfile,
	})

	// Get all available plant profiles
	const plantProfiles = await PlantProfile.find()
		.select('plantType')
		.lean()
		.exec()

	// Extract only the plant types
	const plantTypes: string[] = []
	if (plantProfiles.length > 0) {
		for (const profile of plantProfiles) {
			plantTypes.push(profile.plantType)
		}
	}

	// Send available plant types to client
	socket.emit('available_plants', plantTypes)

	/**
	 * Flow 2: Web Frontend -> Web Server -> MQTT -> ESP -> Output
	 * Handle commands sent from the web frontend to the device
	 */

	// Listen for command events from the client to send to the device
	socket.on('pump', (enable: boolean) => {
		console.log(
			`${chalk.blue('[Pump] User')} ${socket.id} requested pump state: ${enable}`
		)

		// Validate command action before sending to device
		if (PlantManager.state.auto) {
			// Prevent manual pump activation if system is in auto mode
			console.log(
				`${chalk.yellow(
					'⚠️  [Warning] Pump activation command ignored because system is in auto mode.'
				)}`
			)

			// Acknowledge command ignored
			socket.emit('command_ack', {
				success: false,
				message: 'Cannot manually start pump while in auto mode.',
			})
			return
		} else if (enable == PlantManager.state.pumpActive) {
			// Prevent redundant pump state changes
			console.log(
				`${chalk.yellow(
					'⚠️  [Warning] Pump state unchanged. No action taken.'
				)}`
			)

			// Acknowledge command ignored
			socket.emit('command_ack', {
				success: false,
				message: 'Pump state is already set to the requested value.',
			})
			return
		}

		// Publish to device via MQTT
		try {
			publishToDevice(
				JSON.stringify({
					action: IoTAction.Pump,
					enable: enable,
				})
			)

			// Update system state
			// PlantManager.state.pumpActive = enable

			// // Broadcast UI update
			// io.emit('pump_state_update', enable)

			// Acknowledge command receipt
			socket.emit('command_ack', {
				success: true,
				message:
					'Pump command sent successfully. Please wait for device update...',
			})
		} catch (err) {
			console.error(
				`${chalk.red('✗ Server: Failed to publish command to device via MQTT:')}`,
				err
			)

			// Acknowledge command failure
			socket.emit('command_ack', {
				success: false,
				message: 'Failed to send pump command to device',
			})
		}
	})

	// Listen for auto mode toggle events from the client to update system state
	socket.on('toggle_auto_mode', (enable: boolean) => {
		console.log(
			chalk.yellow(
				`[Config] Auto Mode set to ${enable}. Syncing to Device...`
			)
		)

		// Validate command action before sending to device
		if (PlantManager.state.auto == enable) {
			console.log(
				chalk.yellow(
					'⚠️  [Warning] Auto Mode state unchanged. No action taken.'
				)
			)

			// Acknowledge command ignored
			socket.emit('command_ack', {
				success: false,
				message: 'Auto Mode is already set to the requested value.',
			})
			return
		}

		try {
			publishToDevice(
				JSON.stringify({
					action: IoTAction.ToggleAuto,
					value: enable,
				})
			)

			// Update system state
			// PlantManager.state.auto = enable

			// // Broadcast UI update
			// io.emit('auto_state_update', enable)

			// Acknowledge command receipt
			socket.emit('command_ack', {
				success: true,
				message:
					'Auto Mode update sent successfully. Please wait for device update...',
			})
		} catch (err) {
			console.error(
				`${chalk.red('✗ Server: Failed to publish auto mode update to device via MQTT:')}`,
				err
			)

			// Acknowledge command failure
			socket.emit('command_ack', {
				success: false,
				message: 'Failed to send Auto Mode update to device',
			})
		}
	})

	// Listen for plant type change events from the client to load new safe thresholds
	socket.on('change_plant_type', (plantType: string) => {
		console.log(
			`${chalk.blue('[Change Plant] User ${socket.id} changed plant type to ${plantType}.')}`
		)

		// Validate command action before sending to device
		if (PlantManager.currentPlantType == plantType) {
			console.log(
				chalk.yellow(
					'⚠️  [Warning] Plant type unchanged. No action taken.'
				)
			)

			// Acknowledge command ignored
			socket.emit('command_ack', {
				success: false,
				message: 'Plant type is already set to the requested value.',
			})
			return
		}

		// Send updated safe thresholds to the client
		try {
			const thresholds = PlantProfile.findOne({
				plantType: plantType,
			})
				.lean()
				.exec()

			// Send the new thresholds to the device
			publishToDevice(
				JSON.stringify({
					action: IoTAction.SetThreshold,
					value: thresholds,
				})
			)

			// Update current plant type
			PlantManager.currentPlantType = plantType

			// Broadcast plant type update
			io.emit('plant_type_update', {
				plantType: plantType,
				thresholds: thresholds,
			})

			// Send safe thresholds to client
			socket.emit('command_ack', {
				success: true,
				message: 'Safe thresholds updated successfully.',
			})
		} catch (err) {
			console.error(
				`${chalk.red('✗ Server: Failed to load plant profile from database:')}`,
				err
			)

			// Notify client of failure
			socket.emit('command_ack', {
				success: false,
				message: 'Failed to load plant profile from server.',
			})
		}
	})
}

/**
 * Broadcast sensor data to all connected clients
 *
 * @param io - The Socket.io server instance
 * @param data - The sensor data to broadcast
 */
export const broadcastSensorData = (io: Server, data: SensorUpdate) => {
	// Maintain only the latest MAX_SENSOR_RECORD_STORE updates
	while (PlantManager.latestSensorRecords.length >= MAX_SENSOR_RECORD_STORE) {
		PlantManager.latestSensorRecords.shift()
	}

	// Update the latest sensor update data for this device
	PlantManager.latestSensorRecords.push({
		data: data.sensorData,
		timestamp: new Date(),
	})

	// Broadcast to all connected web clients
	io.emit('sensor_update', {
		success: true,
		data: data,
	})
}

/**
 * Broadcast pump state update to all connected clients
 *
 * @param io - The Socket.io server instance
 * @param data - The device state update to broadcast
 */
export const broadcastDeviceStateUpdate = (
	io: Server,
	data: DeviceStateUpdate
) => {
	switch (data.state) {
		case IoTDeviceState.Pump:
			PlantManager.state.pumpActive = data.enable
			io.emit('pump_state_update', data.enable)
			break

		case IoTDeviceState.AutoMode:
			PlantManager.state.auto = data.enable
			io.emit('auto_state_update', data.enable)
			break

		default:
			console.warn(
				`${chalk.yellow('⚠️  [Warning] Unknown device state update received:')} ${data.state}`
			)
	}
}
