import type { Dispatch } from 'react'

import type { PageState, PageReducerAction } from 'Client/Data/Types/index.js'
import PageContext from './context.js'
import PageProvider from './provider.js'
import usePage from './hook.js'

/**
 * Type definition for the Socket context value.
 *
 * @property {PageState} pageState - The current state of the page
 * @property {Function} dispatch - Function to dispatch actions to update the page state
 * @property {(type: 'success' | 'error' | 'info', message: string, timeout?: number) => void} notify - Function to create notifications
 */
export type PageContextValueType = {
	pageState: PageState
	dispatch: Dispatch<PageReducerAction>
	notify: (
		type: 'success' | 'error' | 'info',
		message: string,
		timeout?: number
	) => void
}

export { PageContext, PageProvider, usePage }
