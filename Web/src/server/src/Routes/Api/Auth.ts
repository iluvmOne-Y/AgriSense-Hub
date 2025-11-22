import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import assert from 'assert'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import passport from 'passport'

import { EMAIL_PROVIDER } from 'Data/Constants/index.js'
import Keys from 'Config/Keys.js'
import User, { IUser } from 'Models/User.js'
import Auth from 'Middleware/Auth.js'
import Validate from 'Middleware/Validate.js'
import MailService from 'Services/NotificationService/Mail/index.js'

/** Router for authentication-related routes */
const router = express.Router()

// Extract JWT secret and token life from config
const { secret, tokenLife } = Keys.jwt
assert(secret, 'JWT secret is not configured.')
assert(tokenLife, 'JWT token life is not configured.')

/**
 * Login route.
 * Authenticates user with email and password.
 *
 * @route POST /login
 */
router.post(
	'/login',
	Validate([
		body('email')
			.isEmail()
			.withMessage('You must enter a valid email address.'),
		body('password').notEmpty().withMessage('You must enter a password.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { email, password } = req.body

			// Find user by email
			const user = await User.findOne({ email })
			if (!user) {
				return res
					.status(400)
					.send({ error: 'No user found for this email address.' })
			}

			// Ensure user registered via email, not social provider
			if (user.provider !== EMAIL_PROVIDER.Email) {
				return res.status(400).send({
					error: `That email address is already in use using ${user.provider} provider.`,
				})
			}

			// Ensure user has a password set
			if (!user.password) {
				return res
					.status(400)
					.json({ error: 'Password not set for this user.' })
			}

			// Check password
			const isMatch = await bcrypt.compare(password, user.password)
			if (!isMatch) {
				return res.status(400).json({
					success: false,
					error: 'Password Incorrect',
				})
			}

			// Create JWT token
			const payload = { id: user.id as string }
			const token = jwt.sign(payload, secret as jwt.Secret, {
				expiresIn: tokenLife as any,
			})

			// Respond with user info and token
			res.status(200).json({
				success: true,
				token: `Bearer ${token}`,
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					role: user.role,
				},
			})
		} catch (error: any) {
			// Handle errors
			res.status(400).json({
				error:
					error.message ||
					'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Registration route.
 * Registers a new user and sends a signup email.
 *
 * @route POST /register
 */
router.post(
	'/register',
	Validate([
		body('email')
			.isEmail()
			.withMessage('You must enter a valid email address.'),
		body('firstName')
			.notEmpty()
			.withMessage('You must enter your first name.'),
		body('lastName')
			.notEmpty()
			.withMessage('You must enter your last name.'),
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { email, firstName, lastName, password } = req.body

			// Check if user already exists
			if (await User.findOne({ email })) {
				return res
					.status(400)
					.json({ error: 'That email address is already in use.' })
			}

			// Hash password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(password, salt)

			// Create new user
			const user = new User()
			user.email = email
			user.password = hash
			user.firstName = firstName
			user.lastName = lastName

			// Save user to database
			const registeredUser = await user.save()

			// Send signup email
			await MailService.sendMail(registeredUser.email, 'signup', {
				name: { firstName, lastName },
			})

			// Create JWT token
			const token = jwt.sign({ id: registeredUser.id }, secret, {
				expiresIn: tokenLife as any,
			})

			// Respond with user info and token
			res.status(200).json({
				success: true,
				token: `Bearer ${token}`,
				user: {
					id: registeredUser.id,
					firstName: registeredUser.firstName,
					lastName: registeredUser.lastName,
					email: registeredUser.email,
					role: registeredUser.role,
				},
			})
		} catch (error: any) {
			// Handle errors
			res.status(400).json({
				error:
					error.message ||
					'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Forgot password route.
 * Sends a password reset email to the user.
 *
 * @route POST /forgot
 */
router.post(
	'/forgot',
	Validate([
		body('email').isEmail().withMessage('You must enter an email address.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { email } = req.body

			// Find user by email
			const existingUser = await User.findOne({ email })
			if (!existingUser) {
				return res
					.status(400)
					.send({ error: 'No user found for this email address.' })
			}

			// Generate reset token
			const buffer = crypto.randomBytes(48)
			const resetToken = buffer.toString('hex')

			// Set reset token and expiry on user
			existingUser.resetPasswordToken = resetToken
			existingUser.resetPasswordExpires = new Date(Date.now() + 3600000) // 1 hour
			await existingUser.save()

			// Send reset email
			await MailService.sendMail(existingUser.email, 'reset', {
				resetToken,
			})

			res.status(200).json({
				success: true,
				message:
					'Please check your email for the link to reset your password.',
			})
		} catch (error: any) {
			// Handle errors
			res.status(400).json({
				error:
					error.message ||
					'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Password reset route (with token).
 * Resets the user's password using a reset token.
 *
 * @route POST /reset/:token
 */
router.post(
	'/reset/:token',
	Validate([
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { password } = req.body

			// Find user by reset token and check expiry
			const resetUser = await User.findOne({
				resetPasswordToken: req.params.token,
				resetPasswordExpires: { $gt: Date.now() },
			})
			if (!resetUser) {
				return res.status(400).json({
					error: 'Your token has expired. Please attempt to reset your password again.',
				})
			}

			// Hash new password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(password, salt)

			// Update user password and clear reset token
			resetUser.password = hash
			resetUser.resetPasswordToken = undefined
			resetUser.resetPasswordExpires = undefined
			await resetUser.save()

			// Send confirmation email
			await MailService.sendMail(
				resetUser.email,
				'reset-confirmation',
				{}
			)

			res.status(200).json({
				success: true,
				message:
					'Password changed successfully. Please login with your new password.',
			})
		} catch (error: any) {
			// Handle errors
			res.status(400).json({
				error:
					error.message ||
					'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Authenticated password reset route.
 * Allows logged-in users to change their password.
 *
 * @route POST /reset
 */
router.post(
	'/reset',
	Auth,
	Validate([
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long.'),
		body('confirmPassword')
			.custom((value, { req }) => value === req.body.password)
			.withMessage('Passwords do not match.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { password, confirmPassword } = req.body
			const email = (req.user as IUser).email

			// Find user by email
			const existingUser = await User.findOne({ email })
			if (!existingUser) {
				return res
					.status(400)
					.json({ error: 'That email address is already in use.' })
			}

			// Check old password
			const isMatch = await bcrypt.compare(
				password,
				existingUser.password as string
			)
			if (!isMatch) {
				return res
					.status(400)
					.json({ error: 'Please enter your correct old password.' })
			}

			// Hash new password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(confirmPassword, salt)
			existingUser.password = hash
			await existingUser.save()

			// Send confirmation email
			await MailService.sendMail(
				existingUser.email,
				'reset-confirmation',
				{}
			)

			// Respond with success message
			res.status(200).json({
				success: true,
				message:
					'Password changed successfully. Please login with your new password.',
			})
		} catch (error: any) {
			// Handle errors
			res.status(400).json({
				error:
					error.message ||
					'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Google OAuth login route.
 * Redirects to Google for authentication.
 *
 * @route GET /google
 */
router.get(
	'/google',
	passport.authenticate('google', {
		session: false,
		scope: ['profile', 'email'],
		accessType: 'offline',
		approvalPrompt: 'force',
	} as any)
)

/**
 * Google OAuth callback route.
 * Handles Google authentication response and redirects to client.
 *
 * @route GET /google/callback
 */
router.get(
	'/google/callback',
	passport.authenticate('google', {
		failureRedirect: `${Keys.app.clientURL}/login`,
		session: false,
	}),
	(req: Request, res: Response) => {
		// Generate JWT token for authenticated user
		const payload = { id: (req.user as IUser).id }
		const token = jwt.sign(payload, secret, { expiresIn: tokenLife as any })
		const jwtToken = `Bearer ${token}`

		// Redirect to client with token
		res.redirect(`${Keys.app.clientURL}/Auth/success?token=${jwtToken}`)
	}
)

export default router
