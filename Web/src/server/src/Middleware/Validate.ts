import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'

/**
 * Middleware to validate request data based on provided validation chains.
 *
 * @param validations - Array of validation chains
 * @returns Express middleware function
 */
export default (validations: ValidationChain[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Run all validations
		await Promise.all(validations.map((validation) => validation.run(req)))

		// Gather validation results
		const errors = validationResult(req)
		if (errors.isEmpty()) {
			return next()
		}

		// Return validation errors if any
		res.status(400).json({ errors: errors.array() })
	}
}
