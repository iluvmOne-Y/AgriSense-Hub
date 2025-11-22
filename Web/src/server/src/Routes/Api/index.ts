import authRoutes from './Auth.js'

/** Main API router that aggregates all API route modules */
import express from 'express'
const router = express.Router()

// Auth routes
router.use('/auth', authRoutes)

export default router
