import type { Express } from 'express'
import passport from 'passport'
import mongoose from 'mongoose'
import JwtPassport from 'passport-jwt'

import Keys from './Keys.js'

const User = mongoose.model('User')
const Secret = Keys.jwt.secret as string

/**
 * JWT strategy options for Passport.
 *
 * @property jwtFromRequest - Function to extract JWT from request
 * @property secretOrKey - Secret key to verify JWT signature
 */
const options: JwtPassport.StrategyOptions = {
	jwtFromRequest: JwtPassport.ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: Secret,
}

/**
 * Verifies the JWT payload and retrieves the corresponding user.
 *
 * @param payload - The JWT payload containing user information
 * @param done - Callback function to be called after verification
 */
function verify(
	payload: { id: string },
	done: (error: Error | null, user: typeof User | null) => void
) {
	// Find the user by ID from the JWT payload
	User.findById(payload.id)
		.then((user: typeof User | null) => {
			if (user) {
				return done(null, user)
			}
			return done(null, null)
		})
		.catch((err: Error) => {
			return done(err, null)
		})
}

/**
 * Configures Passport to use JWT strategy for authentication.
 * Finds user by ID from JWT payload.
 */
passport.use(new JwtPassport.Strategy(options, verify))

/**
 * Initializes Passport middleware for the Express app.
 *
 * @param app - The Express application instance
 * @returns A promise that resolves when Passport is initialized
 */
export default async function initializePassport(app: Express): Promise<void> {
	app.use(passport.initialize())
}
