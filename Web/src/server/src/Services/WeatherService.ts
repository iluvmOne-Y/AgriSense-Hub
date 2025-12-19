import chalk from 'chalk'
import openmeoteo from 'openmeteo'
import { EventEmitter } from 'events'

import { HOCHIMINH_COORD, WEATHER_API_URL } from 'Server/Data/Constants.js'

/**
 * Type definition for forecast data
 *
 * @type ForcastData
 * @property {number | null} rainProbability - Probability of rain in percentage
 */
export type ForcastData = {
	rainProbability: number
}

/**
 * Configuration for weather forecast API request
 *
 * @property {number} latitude - Latitude of the location
 * @property {number} longitude - Longitude of the location
 * @property {string} hourly - Type of hourly data to fetch
 * @property {number} forecast_days - Number of days to forecast
 * @property {string} timezone - Timezone for the forecast data
 */
const FORCAST_PARAMS = {
	latitude: HOCHIMINH_COORD.latitude,
	longitude: HOCHIMINH_COORD.longitude,
	hourly: 'precipitation_probability',
	forecast_days: 1,
	timezone: 'Asia/Ho_Chi_Minh',
}

/**
 * Event emitter for forecast updates
 *
 * @prop {EventEmitter} forcastEventEmiiter - Event emitter instance
 */
const forcastEventEmiiter = new EventEmitter()

/**
 * Service for fetching weather data from Open-Meteo API
 *
 * @class WeatherService
 */
const WeatherService = {
	/**
	 * Latest fetched current hour
	 *
	 * @prop {number | null} latestForcastedHour - Hour of the latest forecast
	 */
	latestForcastedHour: null as number | null,

	/**
	 * Latest weather forecast data
	 *
	 * @prop {ForcastData | null} lastestWeatherForcast - Latest fetched weather forecast data
	 */
	lastestWeatherForcast: null as ForcastData | null,

	/**
	 * Register listener for forecast updates
	 *
	 * @param {function} listener - Callback function to handle forecast updates
	 */
	onWeatherForcastUpdate: (listener: (data: ForcastData) => void) => {
		forcastEventEmiiter.on('forcast_update', listener)
	},

	/**
	 * Fetch weather forecast data from Open-Meteo API
	 *
	 * @returns The latest weather forecast data
	 */
	forcastWeather: async (): Promise<ForcastData> => {
		try {
			const currentHour = new Date().getHours()

			// Return cached weather data if the forecast for the current hour is already fetched
			if (
				WeatherService.latestForcastedHour !== null &&
				WeatherService.latestForcastedHour == currentHour
			) {
				return WeatherService.lastestWeatherForcast as ForcastData
			}

			// Fetch weather forecast from Open-Meteo
			const response = (
				await openmeoteo.fetchWeatherApi(
					WEATHER_API_URL,
					FORCAST_PARAMS
				)
			)[0]

			// Extract rain probability for the current hour
			const rainProb = response
				.hourly()
				?.variables(0)
				?.valuesArray()
				?.at(currentHour)

			// Validate rain probability data
			if (rainProb === undefined) {
				throw new Error('Rain probability data is undefined')
			}

			// Update cached forecast data
			WeatherService.latestForcastedHour = currentHour
			WeatherService.lastestWeatherForcast = {
				rainProbability: rainProb,
			}

			return WeatherService.lastestWeatherForcast
		} catch (err: any) {
			console.error(`${chalk.red('✗ Weather API Fetch Error:')}`, err)
			throw new Error(err.message || 'Failed to fetch weather data')
		}
	},
}

// Calculate the remaining time until the next hour
const now = new Date()
const minutes = now.getMinutes()
const seconds = now.getSeconds()
const milliseconds = now.getMilliseconds()
const timeToNextHour =
	(59 - minutes) * 60 * 1000 + (60 - seconds) * 1000 + (1000 - milliseconds)

// Fetch weather data at the start of the next hour
setTimeout(async () => {
	try {
		await WeatherService.forcastWeather()
		forcastEventEmiiter.emit(
			'forcast_update',
			WeatherService.lastestWeatherForcast
		)

		console.log(
			`${chalk.green('✓')} Weather data updated successfully at the start of the hour.`
		)
	} catch (error: Error | any) {
		console.error(
			chalk.red(
				'✗ Failed to update weather data at the start of the hour:'
			),
			error.messgae
		)
	}

	// Set interval to fetch weather data every hour thereafter
	setInterval(
		async () => {
			try {
				await WeatherService.forcastWeather()
				forcastEventEmiiter.emit(
					'forcast_update',
					WeatherService.lastestWeatherForcast
				)

				console.log(
					`${chalk.green('✓')} Weather data updated successfully.`
				)
			} catch (error: Error | any) {
				console.error(
					chalk.red('✗ Failed to update weather data:'),
					error.messgae
				)
			}
		},
		60 * 60 * 1000
	) // Every hour
}, timeToNextHour)

export default WeatherService
