import React, { useMemo } from 'react'

import type { SensorData, SafeThresholds } from 'Shared/Data/Types/index.js'

/**
 * MonitorPanel component to display real-time sensor data and system status.
 *
 * @param props - The props for the MonitorPanel component.
 * @return The MonitorPanel component.
 */
const MonitorPanel: React.FC<{
	currentReadings: SensorData | null
	thresholds: SafeThresholds | null
	isPumpActive: boolean
	rainProbability: number | null
}> = ({ currentReadings, thresholds, isPumpActive, rainProbability }) => {
	/**
	 * Calculates the system status based on current readings and safety thresholds.
	 *
	 * @param current - Current sensor readings.
	 * @param thresholds - Active safety thresholds.
	 * @return An object containing the status text and CSS class.
	 */
	const calculateSystemStatus = (
		current: SensorData | null,
		thresholds: SafeThresholds | null
	): { text: string; class: string } => {
		if (!current || !thresholds) {
			return { text: 'Loading...', class: '' }
		}

		const warnings: string[] = []

		if (current.temperature > thresholds.temperature.upper)
			warnings.push('Temp High')
		if (current.temperature < thresholds.temperature.lower)
			warnings.push('Temp Low')

		if (current.moisture < thresholds.moisture.lower)
			warnings.push('Soil Dry')
		if (current.moisture > thresholds.moisture.upper)
			warnings.push('Soil Too Wet')

		if (current.humidity < thresholds.humidity.lower)
			warnings.push('Air Dry')
		if (current.humidity > thresholds.humidity.upper)
			warnings.push('Air Too Humid')

		if (warnings.length > 0) {
			return {
				text: `Warning: ${warnings.join(', ')}`,
				class: 'status-warn',
			}
		}

		return { text: 'Optimal (Good)', class: 'status-good' }
	}

	/**
	 * Memoized system status based on readings and thresholds.
	 */
	const systemStatus = useMemo(
		() => calculateSystemStatus(currentReadings, thresholds),
		[currentReadings, thresholds]
	)

	return (
		<div className="panel monitor-panel">
			<h2>Environment Monitor</h2>
			<div className="monitor-list">
				<div className="monitor-item">
					<span>Temperature</span>
					<span
						className="monitor-value"
						style={{ color: '#e74c3c' }}
					>
						{currentReadings
							? `${currentReadings.temperature.toFixed(1)} °C`
							: '--'}
					</span>
				</div>
				<div className="monitor-item">
					<span>Soil Moisture</span>
					<span
						className="monitor-value"
						style={{ color: '#387908' }}
					>
						{currentReadings
							? `${currentReadings.moisture.toFixed(1)} %`
							: '--'}
					</span>
				</div>
				<div className="monitor-item">
					<span>Humidity</span>
					<span
						className="monitor-value"
						style={{ color: '#3498db' }}
					>
						{currentReadings
							? `${currentReadings.humidity.toFixed(1)} %`
							: '--'}
					</span>
				</div>
				<hr
					style={{
						width: '100%',
						borderColor: '#eee',
						margin: '10px 0',
					}}
				/>
				<div className="monitor-item">
					<span>Pump Status</span>
					<span
						className={`monitor-value ${isPumpActive ? 'status-good' : ''}`}
					>
						{isPumpActive ? 'Active (On)' : 'Inactive (Off)'}
					</span>
				</div>

				{/* System Status Section */}
				<div className="monitor-item">
					<span>System Status</span>
					<span className={`monitor-value ${systemStatus.class}`}>
						{systemStatus.text}
					</span>
				</div>

				{/* Rain Probability Section */}
				<div className="monitor-item">
					<span>Rain Probability</span>
					<span
						className="monitor-value"
						style={{ color: '#9b59b6' }}
					>
						{rainProbability !== null
							? `${rainProbability} %`
							: '--'}
					</span>
				</div>
			</div>
		</div>
	)
}

export default MonitorPanel
