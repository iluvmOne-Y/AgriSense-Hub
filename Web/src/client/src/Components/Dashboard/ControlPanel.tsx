import React from 'react'

import { useSensor } from 'Client/Contexts/Sensor/index.js'

/**
 * ControlPanel component to manage plant profile, auto mode, and pump control.
 *
 * @return The ControlPanel component.
 */
const ControlPanel: React.FC = () => {
	const {
		selectedPlant,
		availablePlants,
		isAutoMode,
		isPumpActive,
		thresholds,
		onPlantChange,
		onAutoToggle,
		onPumpToggle,
	} = useSensor()

	return (
		<div className="panel control-panel">
			<h2>Controls & Configuration</h2>

			<div className="control-group">
				<label htmlFor="plant-select">Plant Profile</label>
				<select
					className="control-select"
					value={selectedPlant || ''}
					onChange={onPlantChange}
				>
					{availablePlants.length === 0 && (
						<option disabled value="">
							Loading plant profiles...
						</option>
					)}
					{availablePlants.map((plantName) => (
						<option key={plantName} value={plantName}>
							{plantName}
						</option>
					))}
				</select>
			</div>

			<div className="toggle-wrapper">
				<span style={{ fontWeight: 'bold' }}>Auto Mode</span>
				<label className="switch">
					<input
						type="checkbox"
						checked={isAutoMode}
						onChange={onAutoToggle}
					/>
					<span className="slider round"></span>
				</label>
			</div>

			{thresholds && (
				<div
					className="control-group"
					style={{
						fontSize: '0.85em',
						background: '#f8f9fa',
						padding: '10px',
						borderRadius: '4px',
						border: '1px solid #eee',
					}}
				>
					<b>Active Safe Thresholds:</b>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '5px',
							marginTop: '5px',
						}}
					>
						<span>
							Temp: {thresholds.temperature.lower} -{' '}
							{thresholds.temperature.upper}°C
						</span>
						<span>
							Soil: {thresholds.moisture.lower} -{' '}
							{thresholds.moisture.upper}%
						</span>
						<span>
							Hum: {thresholds.humidity.lower} -{' '}
							{thresholds.humidity.upper}%
						</span>
					</div>
				</div>
			)}

			<button
				className={`pump-btn ${isPumpActive ? 'off' : ''}`}
				style={{
					marginTop: '20px',
					opacity: isAutoMode ? 0.6 : 1,
				}}
				onClick={onPumpToggle}
				disabled={isAutoMode}
			>
				{isAutoMode
					? 'Disable Auto Mode to Control Pump'
					: isPumpActive
						? 'Stop pump'
						: 'Start pump'}
			</button>
		</div>
	)
}

export default ControlPanel
