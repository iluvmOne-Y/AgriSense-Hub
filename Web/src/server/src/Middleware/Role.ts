import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware generator to check if the user has one of the specified roles.
 *
 * @param roles - Allowed roles
 * @returns Express middleware function
 */
export function check(...roles: string[]) {
	return (req: Request, res: Response, next: NextFunction) => {
		// If the user is not authenticated, return a 401 Unauthorized response
		if (!req.user) {
			return res.status(401).send('Unauthorized')
		}

		// Type assertion for user object
		const user = req.user as { role: string }

		// Return a 403 Forbidden response if the user's role is not valid
		if (roles.length != 0 && !roles.includes(user.role)) {
			return res
				.status(403)
				.send('You are not allowed to make this request.')
		}

		// Proceed to the next middleware or route handler otherwise
		return next()
	}
}

export default { check }
