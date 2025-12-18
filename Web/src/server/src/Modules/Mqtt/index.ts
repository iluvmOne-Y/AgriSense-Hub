import mqtt, { IClientOptions, MqttClient } from 'mqtt'
import { Server } from 'socket.io'
import chalk from 'chalk'

import {
	SensorData,
	SensorUpdate,
	DeviceStateUpdate,
} from 'Shared/Data/Types/index.js'
import Keys from 'Server/Config/Keys.js'
import User from 'Server/Models/User.js'
import SensorRecord from 'Server/Models/SensorRecord.js'
import {
	initHandler,
	broadcastSensorData,
	broadcastDeviceStateUpdate,
	PlantManager,
	evaluateAndPublishPumpDecision,
} from './Handler.js'
import NotificationService from 'Server/Services/NotificationService/index.js'

import {
	initWeatherService,
	startWeatherForecastScheduler,
} from 'Server/Services/Weather/WeatherService.js'
import GetSmsTemplate from 'Server/Services/NotificationService/telegramNotify/Template.js'

/* MQTT Client Setup */
const MQTT_CONFIG: IClientOptions = {
	host: Keys.mqtt.host,
	port: Keys.mqtt.port,
	protocol: 'mqtts',
	username: Keys.mqtt.user,
	password: Keys.mqtt.pass,
	rejectUnauthorized: true,
}

/* MQTT Client Instance */
let mqttClient: MqttClient

/* MQTT Topics */
const topicData = `devices/${Keys.mqtt.deviceId}/data`
const topicCommands = `devices/${Keys.mqtt.deviceId}/commands`

/**
 * Check sensor data against safe thresholds and notify users if needed
 *
 * @param sensorData - The latest sensor data to check
 */
const checkAndNotify = async (sensorData: SensorData) => {
	console.log(
		chalk.blue(
			`Sensor Check: T:${sensorData.temperature}C, H:${sensorData.humidity}%, M:${sensorData.moisture}%`
		)
	)

	try {
		const profile = PlantManager.currentPlantProfile
		if (!profile) {
			console.warn(
				chalk.yellow(
					'⚠️ No Plant Profile Loaded. Skipping sensor check.'
				)
			)
			return
		}

		// Check sensor data against thresholds
		const warnings: string[] = []
		const safeThresholds = profile.safeThresholds

		if (sensorData.temperature > safeThresholds.temperature.upper)
			warnings.push('High Temp')
		if (sensorData.temperature < safeThresholds.temperature.lower)
			warnings.push('Low Temp')

		if (sensorData.humidity < safeThresholds.humidity.lower)
			warnings.push('Low Humidity')
		if (sensorData.humidity > safeThresholds.humidity.upper)
			warnings.push('High Humidity')

		if (sensorData.moisture < safeThresholds.moisture.lower)
			warnings.push('Low Moisture (Dry)')
		if (sensorData.moisture > safeThresholds.moisture.upper)
			warnings.push('High Moisture (Waterlogged)')

		// Check if any warnings were generated
		if (warnings.length > 0) {
			console.log(
				chalk.magenta(
					`⚠️ Critical Sensor Data Detected: ${warnings.join(', ')}`
				)
			)
			const users = await User.find().lean().exec()

			// Prepare notify msg
			const smsMessage = GetSmsTemplate('alert', {
				warnings,
				sensorData,
			})

			//send notify via telegram
			if (smsMessage) {
				NotificationService.sendTelegramAlert(smsMessage)
			}

			// // Notify all users via Email
			// for (const user of users) {
			// 	if (user.email) {
			// 		NotificationService.MailService.sendMail(
			// 			user.email,
			// 			'alert',
			// 			{
			// 				username: user.username,
			// 				warnings: warnings,
			// 				sensorData: sensorData,
			// 			}
			// 		)
			// 	}
		}
	} catch (error) {
		console.error(
			chalk.red(
				'Error while checking sensor data against safe thresholds:'
			),
			error
		)
	}
}

/**
 * Initialize MQTT connection and set up message handling
 *
 * @param io - The Socket.io server instance
 */
export const initMqtt = (io: Server) => {
	// Initialize handler to load latest sensor updates
	initHandler()

	// Connect to MQTT Broker
	mqttClient = mqtt.connect(MQTT_CONFIG)

	initWeatherService(mqttClient) // Task2 - HUY QUANG TRUONG

	// Handle successful connection
	mqttClient.on('connect', () => {
		console.log(
			`${chalk.green('✓')} ${chalk.blue('Server: Connected to MQTT Broker (TLS)')}`
		)

		// Subscribe to topics for all known devices
		mqttClient.subscribe(topicData, (err) => {
			if (err) {
				console.error(
					`${chalk.red('✗ Server: MQTT Subscription Error:')}`,
					err
				)
			} else {
				console.log(
					`${chalk.green('✓')} ${chalk.blue(`Server: Subscribed to topic ${topicData}`)}`
				)
			}
		})

		console.log(chalk.cyan('Starting Weather Forecast Scheduler...'))
		startWeatherForecastScheduler() // Task2 - HUY QUANG TRUONG

		// TASK 1 - HUY QUANG TRUONG
		console.log(
			chalk.cyan('Starting Pump Decision Scheduler (Every 10s)...')
		)
		setInterval(() => {
			evaluateAndPublishPumpDecision().catch((err) => {
				console.error(
					`${chalk.red('✗ Server: Scheduled Pump Evaluation Error:')}`,
					err
				)
			})
		}, 10000)
		// TASK 1 -  HUY QUANG TRUONG
	})

	// Handle incoming MQTT messages
	mqttClient.on('message', async (topic, message) => {
		if (!topic || !message) return // Ignore invalid topics or messages

		// Parse the incoming message
		const parsedMessage = JSON.parse(message.toString()) as
			| SensorUpdate
			| DeviceStateUpdate

		try {
			// Check if the parsed message contains sensor data
			if (parsedMessage.hasOwnProperty('sensorData')) {
				const sensorUpdate = parsedMessage as SensorUpdate

				// Save sensor record to database
				const newSensorUpdate = new SensorRecord({
					data: sensorUpdate.sensorData,
					timestamp: new Date(),
				})
				newSensorUpdate.save().catch((err) => {
					console.error(
						`${chalk.red('✗ Server: Database Sensor Save Error:')}`,
						err
					)
				})

				// Check sensor data and notify users if needed
				await checkAndNotify(sensorUpdate.sensorData)

				// Broadcast sensor data to websocket clients
				broadcastSensorData(io, sensorUpdate)

				// check update state
			} else if (parsedMessage.hasOwnProperty('enable')) {
				const deviceStateUpdate = parsedMessage as DeviceStateUpdate

				// Broadcast device state update to websocket clients
				broadcastDeviceStateUpdate(io, deviceStateUpdate)
			}
		} catch (err) {
			console.error(
				`${chalk.red('✗ Server: MQTT Message Parse Error:')}`,
				err
			)
		}
	})

	// Handle connection errors
	mqttClient.on('error', (err) => {
		console.error(`${chalk.red('✗ Server: MQTT Error:')}`, err)
	})

	// Handle reconnection attempts
	mqttClient.on('reconnect', () => {
		console.log(
			`${chalk.yellow('⚠ Server: Reconnecting to MQTT Broker...')}`
		)
	})
}

/**
 * Publish command to a device via MQTT
 *
 * @param deviceId - ID of the target device
 * @param command - Command to send to the device
 */
export const publishToDevice = (command: string) => {
	if (mqttClient?.connected) {
		mqttClient.publish(topicCommands, command)
		console.log(`Sent "${command}" to ${topicCommands}`)
	}
}

export default null

// //TASK 1 -  HUY QUANG TRUONG
// export const evaluateAndPublishPumpDecision = async () => {
// 	try {
// 		//  Get latest 5 sensor records
// 		const records = (await SensorRecord.find()
// 			.sort({ timestamp: -1 })
// 			.limit(5)
// 			.lean()
// 			.exec()) as any[]

// 		// check empty records -> return
// 		if (!records || records.length === 0) {
// 			console.log('No sensor records found. Defaulting to NO pump.')
// 			publishToDevice(JSON.stringify({ action: 'PUMP', enable: false }))
// 			return
// 		}

// 		// fillter
// 		const validRecords = records.filter(
// 			(r) =>
// 				r &&
// 				r.data &&
// 				typeof r.data.moisture === 'number' &&
// 				typeof r.data.temperature === 'number' &&
// 				typeof r.data.humidity === 'number'
// 		)

// 		if (validRecords.length === 0) return

// 		// avg
// 		const sumM = validRecords.reduce((a, b) => a + b.data.moisture, 0)
// 		const sumT = validRecords.reduce((a, b) => a + b.data.temperature, 0)
// 		const sumH = validRecords.reduce((a, b) => a + b.data.humidity, 0)

// 		const avgMoisture = sumM / validRecords.length
// 		const avgTemp = sumT / validRecords.length
// 		const avgHum = sumH / validRecords.length
// 		const latestMoisture = validRecords[0].data.moisture

// 		console.log(
// 			chalk.cyan(
// 				`[Task 1 Analysis] AvgM:${avgMoisture.toFixed(1)}%, AvgT:${avgTemp.toFixed(1)}C | LatestM:${latestMoisture}%`
// 			)
// 		)

// 		let moistureThreshold = 40 // auto threshold

// 		if (avgTemp > 30 && avgHum < 60) {
// 			moistureThreshold = 50
// 			console.log(
// 				chalk.yellow(
// 					'-> Condition: Hot & Dry -> Raised threshold to 50%'
// 				)
// 			)
// 		} else if (avgTemp < 20 || avgHum > 85) {
// 			moistureThreshold = 30
// 			console.log(
// 				chalk.cyan('-> Condition: Cold/Wet -> Lowered threshold to 30%')
// 			)
// 		}

// 		const SAFETY_UPPER_LIMIT = 70

// 		// Decision Making
// 		let shouldPump = false

// 		if (latestMoisture >= SAFETY_UPPER_LIMIT) {
// 			shouldPump = false
// 			console.log(
// 				chalk.magenta(
// 					`-> Safety Cut-off: Latest moisture (${latestMoisture}%) is high.`
// 				)
// 			)
// 		} else if (avgMoisture <= moistureThreshold) {
// 			shouldPump = true
// 			console.log(
// 				chalk.green(
// 					`-> Decision: PUMP ON (Avg Moisture ${avgMoisture.toFixed(1)}% <= ${moistureThreshold}%)`
// 				)
// 			)
// 		} else {
// 			shouldPump = false
// 			console.log(chalk.gray(`-> Decision: PUMP OFF`))
// 		}

// 		// Publish command
// 		const payload = JSON.stringify({
// 			action: 'PUMP',
// 			enable: shouldPump,
// 		})
// 		publishToDevice(payload)
// 	} catch (err) {
// 		console.error(
// 			`${chalk.red('✗ Server: evaluateAndPublishPumpDecision error:')}`,
// 			err
// 		)
// 	}
// }
// //TASK 1 - HUY QUANG TRUONG
