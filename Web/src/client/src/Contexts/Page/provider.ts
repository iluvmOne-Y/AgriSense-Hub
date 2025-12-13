import React, { useReducer } from 'react'
import chalk from 'chalk'

import { PageAction } from 'Client/Data/Constants.js'
import type { PageState, PageReducerAction } from 'Client/Data/Types/index.js'
import PageContext, { DEFAULT } from './context.js'

/**
 * Reducer function to manage page state updates.
 *
 * @param state - The current state of the page.
 * @param action - The action to be performed on the state.
 * @return The updated page state.
 */
const PageReducer = (
	state: PageState,
	action: PageReducerAction
): PageState => {
	switch (action.type) {
		case PageAction.SetPageTitle:
			if (typeof action.payload != 'string') {
				console.error(
					`${chalk.red('[PageReducer]')} Invalid payload for SetPageTitle action.`
				)
				throw new Error('Invalid payload for SetPageTitle action.')
			}
			return { ...state, title: action.payload }
		case PageAction.SetLoading:
			if (typeof action.payload != 'boolean') {
				console.error(
					`${chalk.red('[PageReducer]')} Invalid payload for SetLoading action.`
				)
				throw new Error('Invalid payload for SetLoading action.')
			}
			return { ...state, loading: action.payload }
		case PageAction.AddNotification:
			if (typeof action.payload != 'object' || action.payload == null) {
				console.error(
					`${chalk.red('[PageReducer]')} Invalid payload for AddNotification action.`
				)
				throw new Error('Invalid payload for AddNotification action.')
			}
			return {
				...state,
				notifications: [...state.notifications, action.payload],
			}
		case PageAction.RemoveNotification:
			if (typeof action.payload != 'string') {
				console.error(
					`${chalk.red('[PageReducer]')} Invalid payload for RemoveNotification action.`
				)
				throw new Error(
					'Invalid payload for RemoveNotification action.'
				)
			}
			return {
				...state,
				notifications: state.notifications.filter(
					(n) => n.id !== action.payload
				),
			}
		default:
			return state
	}
}

/**
 * Provider for the PageContext.
 *
 * @param children - The child components that will have access to the PageContext.
 * @return The PageContext provider component.
 */
const PageProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [pageState, dispatch] = useReducer(PageReducer, DEFAULT.pageState)

	/**
	 * Send a notification using the Page context.
	 *
	 * @param type - The type of notification ('success', 'error', 'info').
	 * @param message - The notification message.
	 * @param timeout - Optional timeout in seconds to auto-remove the notification.
	 */
	const notify = (
		type: 'success' | 'error' | 'info',
		message: string,
		timeout?: number
	) => {
		// Generate id for the notif
		const id = `notif-${Date.now()}`

		// Send notification
		dispatch({
			type: PageAction.AddNotification,
			payload: {
				id: id,
				message: message,
				type: type,
			},
		})

		// Auto-remove notification after timeout
		if (timeout) {
			setTimeout(
				() =>
					dispatch({
						type: PageAction.RemoveNotification,
						payload: id,
					}),
				timeout * 1000
			)
		}
	}

	return React.createElement(
		PageContext.Provider,
		{ value: { pageState, dispatch, notify } },
		children
	)
}

export default PageProvider
