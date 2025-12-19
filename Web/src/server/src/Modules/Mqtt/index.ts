import mqtt, { IClientOptions, MqttClient } from 'mqtt'
import { Server } from 'socket.io'
import chalk from 'chalk'

import { SensorUpdate, DeviceStateUpdate } from 'Shared/Data/Types/index.js'
import Keys from 'Server/Config/Keys.js'

import SensorRecord from 'Server/Models/SensorRecord.js'
import {
	initHandler,
	checkAndNotify,
	evaluateAndPublishPumpDecision,
	broadcastSensorData,
	broadcastDeviceStateUpdate,
} from './Handler.js'
import WeatherService from 'Server/Services/WeatherService.js'

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
const topicWeather = `devices/${Keys.mqtt.deviceId}/weather`
const topicCommands = `devices/${Keys.mqtt.deviceId}/commands`

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

	// Handle successful connection
	mqttClient.on('connect', () => {
		console.log(
			`${chalk.green('✓')} ${chalk.blue('Server: Connected to MQTT Broker (TLS)')}`
		)

		// Subscribe to data topic for receiving data
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

		// Listen for weather forecast updates and publish to MQTT
		WeatherService.onWeatherForcastUpdate((weatherData) => {
			mqttClient.publish(topicWeather, JSON.stringify(weatherData))
		})
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

				// Evaluate pump decision and publish command if necessary
				evaluateAndPublishPumpDecision(sensorUpdate.sensorData)

				// Broadcast sensor data to websocket clients
				broadcastSensorData(io, sensorUpdate)
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
