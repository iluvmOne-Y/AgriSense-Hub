import React, { useEffect } from 'react'

import { PageAction } from 'Client/Data/Constants.js'
import { useAuth } from 'Client/Contexts/Authentication/index.js'
import { usePage } from 'Client/Contexts/Page/index.js'
import { useSocket } from 'Client/Contexts/Socket/index.js'
import { useSensor } from 'Client/Contexts/Sensor/index.js'

import MonitorPanel from 'Client/Components/Dashboard/MonitorPanel.js'
import ControlPanel from 'Client/Components/Dashboard/ControlPanel.js'
import HistoryChart from 'Client/Components/Dashboard/HistoryChart.js'

/**
 * Container component for the Dashboard page.
 * Manages logic and renders the dashboard layout using sub-components.
 *
 * @return The DashboardContainer component.
 */
const DashboardContainer: React.FC = () => {
	const { user, logout } = useAuth()
	const { dispatch } = usePage()
	const {
		currentReadings,
		recordHistory,
		isPumpActive,
		thresholds,
		rainProbability,
	} = useSensor()
	const { socket } = useSocket()

	/**
	 * Effect to set the page title on mount.
	 */
	useEffect(() => {
		dispatch({
			type: PageAction.SetPageTitle,
			payload: 'AgriSense Dashboard',
		})
	}, [dispatch])

	return (
		<div className="dashboard-container">
			{/* Header Section */}
			<div className="dashboard-header">
				<div>
					<h1 style={{ margin: 0 }}>AgriSense Monitor</h1>
					<small>
						User: {user?.username} | Connection:{' '}
						{socket ? 'Online' : 'Offline'}
					</small>
				</div>
				<button
					className="submit-btn"
					style={{ width: 'auto', backgroundColor: '#666' }}
					onClick={logout}
				>
					Logout
				</button>
			</div>

			{/* Main Content Grid */}
			<div className="dashboard-grid">
				<MonitorPanel
					currentReadings={currentReadings}
					thresholds={thresholds}
					isPumpActive={isPumpActive}
					rainProbability={rainProbability}
				/>
				<ControlPanel />
			</div>

			{/* Charts Section */}
			<HistoryChart recordHistory={recordHistory} />
		</div>
	)
}

export default DashboardContainer
