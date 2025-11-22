import express, { Request, Response } from 'express'

import apiRoutes from './Api/index.js'
import Keys from 'Config/Keys.js'

/**
 * Main router for the application.
 * Mounts all API routes under the /api prefix.
 */
const router = express.Router()

// Extract the base API URL from configuration
const { apiURL } = Keys.app
const api = `/${apiURL}`

// Mount the API routes
router.use(api, apiRoutes)

// Fallback for any other API route not found
router.use(api, (req: Request, res: Response) => {
	res.status(404).json({ error: 'No API route found' })
})

export default router
