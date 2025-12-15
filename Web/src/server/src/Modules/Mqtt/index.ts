import mqtt, { IClientOptions, MqttClient } from 'mqtt'
import { Server } from 'socket.io'
import chalk from 'chalk'

import { SensorData, DeviceStateUpdate } from 'Shared/Data/Types/index.js'
import Keys from 'Server/Config/Keys.js'
import User from 'Server/Models/User.js'
import SensorRecord from 'Server/Models/SensorRecord.js'
import {
	initHandler,
	broadcastSensorData,
	broadcastDeviceStateUpdate,
	PlantManager,
} from './Handler.js'
import NotificationService from 'Server/Services/NotificationService/index.js'
import GetSmsTemplate from 'Server/Services/NotificationService/Sms/Template.js'
import {
	initWeatherService,
	startWeatherForecastScheduler,
} from 'Server/Services/Weather/WeatherService.js'

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

/*Task1 - HUY QUANG TRUONG*/
const topicPump = `/23127530/pump`
/*Task4 - HUY QUANG TRUONG*/
const topicSensorData = `/23127530/Temperature_Humidity_Moisture`

/**
 * Check sensor data against safe thresholds and notify users if needed
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

			// Prepare SMS content once
			const smsMessage = GetSmsTemplate('alert', {
				warnings,
				sensorData,
			})

			// Notify all users via Email and SMS
			for (const user of users) {
				if (user.email) {
					NotificationService.MailService.sendMail(
						user.email,
						'alert',
						{
							username: user.username,
							warnings: warnings,
							sensorData: sensorData,
						}
					)
				}

				if (user.phoneNumber && smsMessage) {
					NotificationService.SmsService.sendSMS(
						[user.phoneNumber],
						smsMessage
					)
				}
			}
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
 * @param io - The Socket.io server instance
 */
export const initMqtt = (io: Server) => {
	// Initialize handler to load latest sensor updates
	initHandler()

	// Connect to MQTT Broker
	mqttClient = mqtt.connect(MQTT_CONFIG)

	// Initialize Weather Service
	initWeatherService(mqttClient)

	// Handle successful connection
	mqttClient.on('connect', () => {
		console.log(
			`${chalk.green('✓')} ${chalk.blue('Server: Connected to MQTT Broker (TLS)')}`
		)

		// Subscribe to legacy topic (only for device state updates like Pump ON/OFF confirmation)
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

		/*Task4 - HUY QUANG TRUONG*/
		// Subscribe to NEW sensor data topic (For saving to DB)
		mqttClient.subscribe(topicSensorData, (err) => {
			if (err) {
				console.error(
					`${chalk.red('✗ Server: MQTT Subscription Error for sensor topic:')}`,
					err
				)
			} else {
				console.log(
					`${chalk.green('✓')} ${chalk.blue(`Server: Subscribed to topic ${topicSensorData}`)}`
				)
			}
		})
		/*Task4 - HUY QUANG TRUONG*/

		startWeatherForecastScheduler() /*Task2 - HUY QUANG TRUONG*/

		/*Task1 - HUY QUANG TRUONG*/
		console.log(
			chalk.cyan('Starting Pump Decision Scheduler (Every 30s)...')
		)

		setInterval(() => {
			evaluateAndPublishPumpDecision().catch((err) => {
				console.error(
					`${chalk.red('✗ Server: Scheduled Pump Evaluation Error:')}`,
					err
				)
			})
		}, 16000)
		/*Task1 - HUY QUANG TRUONG*/
	})

	// Handle incoming MQTT messages
	mqttClient.on('message', async (topic, message) => {
		if (!topic || !message) return // Ignore invalid topics or messages

		try {
			/* Task4 - HUY QUANG TRUONG */
			if (topic === topicSensorData) {
				const parsedData = JSON.parse(message.toString()) as {
					temp: number
					hum: number
					soil: number
				}

				// Convert incoming format to SensorData format
				const sensorData: SensorData = {
					temperature: parsedData.temp,
					humidity: parsedData.hum,
					moisture: parsedData.soil,
				}

				console.log(
					chalk.blue(
						`Received from ${topic}: T:${sensorData.temperature}°C, H:${sensorData.humidity}%, M:${sensorData.moisture}%`
					)
				)

				// Save sensor record to database (MONGODB CLOUD)
				const newSensorRecord = new SensorRecord({
					data: sensorData,
					timestamp: new Date(),
				})

				try {
					const saved = await newSensorRecord.save()
					console.log(
						`${chalk.green('✓')} Saved sensor record: ${saved._id}`
					)
				} catch (err) {
					console.error(
						`${chalk.red('✗ Server: Database Sensor Save Error:')}`,
						err
					)
				}

				// Check sensor data and notify users if needed
				await checkAndNotify(sensorData)

				// Broadcast sensor data to websocket clients (Frontend)
				broadcastSensorData(io, {
					sensorData: sensorData,
				})

				return
				/* Task4 - HUY QUANG TRUONG */
			}

			const parsedMessage = JSON.parse(message.toString())

			if (parsedMessage.hasOwnProperty('enable')) {
				const pumpStateUpdate = parsedMessage as DeviceStateUpdate
				broadcastDeviceStateUpdate(io, pumpStateUpdate)
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

/*Task1 - HUY QUANG TRUONG*/
/**
 * Publish pump command to dedicated pump topic
 */
export const publishPumpCommand = (command: 'YES' | 'NO') => {
	if (mqttClient?.connected) {
		mqttClient.publish(topicPump, command)
		console.log(`Published pump command "${command}" to ${topicPump}`)
	} else {
		console.warn('MQTT not connected — cannot publish pump command')
	}
}

/**
 * Evaluate last 5 moisture samples and publish YES/NO to pump topic
 * S_trungbinh = (1/5) * sum(Si) for last 5 samples
 */
export const evaluateAndPublishPumpDecision = async () => {
	try {
		const records = (await SensorRecord.find()
			.sort({ timestamp: -1 })
			.limit(5)
			.lean()
			.exec()) as any[]

		if (!records || records.length < 5) {
			console.log(
				'Not enough sensor records to evaluate pump decision (need 5).'
			)
			return
		}

		// Extract moisture values and ensure they are numbers
		const values = records
			.map((r) =>
				r && r.data && typeof r.data.moisture === 'number'
					? r.data.moisture
					: null
			)
			.filter((v) => v !== null) as number[]

		if (values.length < 5) {
			console.log(
				'Not enough valid moisture values to evaluate pump decision.'
			)
			return
		}

		const sum = values.reduce((a, b) => a + b, 0)
		const avg = sum / 5

		console.log(`Average moisture (last 5) = ${avg}`)

		const command: 'YES' | 'NO' = avg <= 40 ? 'YES' : 'NO'
		publishPumpCommand(command)
	} catch (err) {
		console.error(
			`${chalk.red('✗ Server: evaluateAndPublishPumpDecision error:')}`,
			err
		)
	}
}
/*Task1 - HUY QUANG TRUONG*/

/**
 * Publish command to a device via MQTT
 * @param command - Command to send to the device
 */
export const publishToDevice = (command: string) => {
	if (mqttClient?.connected) {
		mqttClient.publish(topicCommands, command)
		console.log(`Sent "${command}" to ${topicCommands}`)
	}
}

export default null
