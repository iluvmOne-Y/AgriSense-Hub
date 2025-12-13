import React from 'react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'

import type { SensorRecordType } from 'Shared/Data/Types/index.js'
import { formatTimestamp } from 'Client/Utility/index.js'

/**
 * HistoryChart component to display historical sensor data in a line chart.
 *
 * @param props - The props for the HistoryChart component.
 * @return The HistoryChart component.
 */
const HistoryChart: React.FC<{
	recordHistory: SensorRecordType[]
}> = ({ recordHistory }) => {
	return (
		<div className="charts-panel">
			<h2 style={{ borderBottom: 'none' }}>Historical Data</h2>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={recordHistory}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="timestamp"
						tickFormatter={formatTimestamp}
						minTickGap={30}
					/>
					<YAxis />
					<Tooltip
						labelFormatter={(label) =>
							new Date(label).toLocaleString()
						}
						contentStyle={{
							borderRadius: '8px',
							border: 'none',
							boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
						}}
					/>
					<Legend />

					<Line
						type="monotone"
						dataKey="data.temperature"
						stroke="#e74c3c"
						name="Temp (°C)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 6 }}
					/>
					<Line
						type="monotone"
						dataKey="data.moisture"
						stroke="#387908"
						name="Soil (%)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 6 }}
					/>
					<Line
						type="monotone"
						dataKey="data.humidity"
						stroke="#3498db"
						name="Humidity (%)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 6 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}

export default HistoryChart
