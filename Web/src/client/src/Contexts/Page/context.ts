import React from 'react'

import type { PageContextValueType } from './index.js'

/**
 * Default values for the PageContext.
 */
export const DEFAULT: PageContextValueType = {
	pageState: {
		title: 'Smart Farm',
		loading: false,
		notifications: [],
	},
	dispatch: () => null,
	notify: () => null,
}

/**
 * Context for managing page state.
 */
const PageContext = React.createContext(DEFAULT)

export default PageContext
