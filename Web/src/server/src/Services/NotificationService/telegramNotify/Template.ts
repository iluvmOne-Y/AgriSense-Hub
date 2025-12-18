import { SensorData } from 'Shared/Data/Types/types_Sensor.js'

/**
 * Generate Notification Alert 
 *
 * @param warnings - Array of warning strings
 * @param data - Current sensor data
 */
export default function (type: string, data: any): string | null {
    if (type !== 'alert') return null

    const warnings = data.warnings as string[]
    const sensor = data.sensorData as SensorData

    // Keep SMS short and concise
    return (
        `[Farm Alert] Critical levels detected: ${warnings.join(', ')}. ` +
        `T:${sensor.temperature}C, H:${sensor.humidity}%, M:${sensor.moisture}%. ` +
        `Check immediately!`
    )
}
