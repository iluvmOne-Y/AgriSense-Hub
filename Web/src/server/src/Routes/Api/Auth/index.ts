import express, { Request, Response } from 'express'
import { body } from 'express-validator'
import chalk from 'chalk'
import assert from 'assert'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import {
	LoginRequest,
	SignupRequest,
	LoginResponse,
} from 'Shared/Data/Types/index.js'
import Keys from 'Server/Config/Keys.js'
import User, { IUser } from 'Server/Models/User.js'
import Auth from 'Server/Middleware/Auth.js'
import Validate from 'Server/Middleware/Validate.js'
//import MailService from 'Server/Services/NotificationService/Mail/index.js'
import { GetUserQueryFromCredential } from './Helper.js'

/** Router for authentication-related routes */
const router = express.Router()

// Extract JWT secret and token life from config
const { secret, tokenLife } = Keys.jwt
assert(secret, 'JWT secret is not configured.')
assert(tokenLife, 'JWT token life is not configured.')

/**
 * Route to get the currently authenticated user.
 *
 * @route GET /auth/me
 */
router.get('/me', Auth, async (req: Request, res: Response) => {
	try {
		const user = req.user as IUser
		res.status(200).json({ success: true, data: { user: user.toObject() } })
	} catch (error) {
		console.error(	
			`${chalk.red('Error fetching authenticated user:')} ${error}`
		)
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.',
		})
	}
})

/**
 * Login route.
 * Authenticates user with email and password.
 *
 * @route POST /auth/login
 */
router.post(
	'/login',
	Validate([
		body('credential')
			.notEmpty()
			.withMessage('You must enter your email or username.'),
		body('password').notEmpty().withMessage('You must enter a password.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { password } = req.body as LoginRequest

			// Find user with the given credential
			const user = await User.findOne(
				await GetUserQueryFromCredential(req)
			)
			if (!user) {
				return res
					.status(400)
					.send({ error: 'No user found for this credential.' })
			}

			// Check password
			const isMatch = await bcrypt.compare(password, user.password)
			if (!isMatch) {
				return res.status(400).json({
					error: 'Password Incorrect',
				})
			}

			// Create JWT token
			const payload = { id: user.id as string }
			const token = jwt.sign(payload, secret as jwt.Secret, {
				expiresIn: tokenLife,
			})

			// Response with token and user info
			const response: LoginResponse = {
				success: true,
				data: {
					token: token,
					user: user.toObject(),
				},
			}
			res.status(200).json(response)
		} catch (error) {
			console.error(`${chalk.red('Error during login:')} ${error}`)
			res.status(400).json({
				error: 'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Registration route.
 * Registers a new user and sends a signup email.
 *
 * @route POST /auth/signup
 */
router.post(
	'/signup',
	Validate([
		body('username')
			.notEmpty()
			.withMessage('You must enter your username.')
			.matches(/^[1-9a-zA-Z_-]+$/)
			.withMessage(
				'Username can only contain latin letters, numbers, underscores, and hyphens.'
			),
		body('email')
			.optional({ nullable: true })
			.isEmail()
			.withMessage('You must enter a valid email address.'),
		body('phoneNumber')
			.optional({ nullable: true })
			.isMobilePhone('any')
			.withMessage('You must enter a valid phone number.'),
		body('password')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { username, phoneNumber, password, email } =
				req.body as SignupRequest

			// Check if username already exists
			if (await User.findOne({ username })) {
				return res
					.status(400)
					.json({ error: 'That username is already in use.' })
			}

			// Check if email is provided and already in use
			if (email && (await User.findOne({ email }))) {
				return res.status(400).json({
					error: 'That email address is already in use.',
				})
			}

			// Check if phone number is provided and already in use
			if (phoneNumber && (await User.findOne({ phoneNumber }))) {
				return res.status(400).json({
					error: 'That phone number is already in use.',
				})
			}

			// Hash password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(password, salt)

			// Create new user and save to database
			const user = await new User({
				email: email,
				phoneNumber: phoneNumber,
				username: username,
				password: hash,
			}).save()

			// // Send signup email
			// if (email) {
			// 	await MailService.sendMail(email, 'signup', {
			// 		username,
			// 	})
			// }

			// Create JWT token
			const token = jwt.sign({ id: user.id }, secret, {
				expiresIn: tokenLife,
			})

			// Respond with user info and token
			const response: LoginResponse = {
				success: true,
				data: {
					token: token,
					user: user.toObject(),
				},
			}
			res.status(200).json(response)
		} catch (error) {
			console.error(`${chalk.red('Error during registration:')} ${error}`)
			res.status(400).json({
				error: 'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Forgot password route.
 * Sends a password reset email to the user.
 *
 * @route POST /auth/forgot
 */
router.post(
	'/forgot',
	Validate([
		body('email').isEmail().withMessage('You must enter an email address.'),
	]),
	async (req: Request, res: Response) => {
		try {
			// Find user by email
			const existingUser = await User.findOne({ email: req.body.email })
			if (!existingUser) {
				return res
					.status(400)
					.send({ error: 'No user found for this email address.' })
			}

			// Ensure user has an email
			if (!existingUser.email) {
				return res.status(400).send({
					error: 'The user associated with this credential does not have an email address.',
				})
			}

			// Generate reset token
			const buffer = crypto.randomBytes(48)
			const resetToken = buffer.toString('hex')

			// Set reset token and expiry on user
			existingUser.resetPasswordToken = resetToken
			existingUser.resetPasswordExpires = new Date(Date.now() + 3600000) // 1 hour
			await existingUser.save()

			// // Send reset email
			// await MailService.sendMail(existingUser.email, 'reset', {
			// 	resetToken,
			// })

			res.status(200).json({
				success: true,
				message:
					'Please check your email for the link to reset your password.',
			})
		} catch (error) {
			console.error(
				`${chalk.red('Error during password reset:')} ${error}`
			)
			res.status(400).json({
				error: 'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Password reset route (with token).
 * Resets the user's password using a reset token.
 *
 * @route POST /auth/reset/:token
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

			// // Send confirmation email
			// if (resetUser.email) {
			// 	await MailService.sendMail(
			// 		resetUser.email,
			// 		'reset-confirmation',
			// 		{}
			// 	)
			// }

			res.status(200).json({
				success: true,
				message:
					'Password changed successfully. Please login with your new password.',
			})
		} catch (error) {
			console.error(
				`${chalk.red('Error during password reset:')} ${error}`
			)
			res.status(400).json({
				error: 'Your request could not be processed. Please try again.',
			})
		}
	}
)

/**
 * Authenticated password reset route.
 * Allows logged-in users to change their password.
 *
 * @route POST /auth/reset
 */
router.post(
	'/reset',
	Auth,
	Validate([
		body('oldPassword')
			.custom((value, { req }) =>
				bcrypt.compare(value, req.user.password)
			)
			.withMessage('Please enter your correct old password.'),
		body('newPassword')
			.isLength({ min: 6 })
			.withMessage('Password must be at least 6 characters long.')
			.custom((value, { req }) => {
				return value != req.body.oldPassword
			})
			.withMessage('New password must be different from old password.'),
	]),
	async (req: Request, res: Response) => {
		try {
			const { password } = req.body
			const user = req.user as IUser

			// Hash new password
			const salt = await bcrypt.genSalt(10)
			const hash = await bcrypt.hash(password, salt)

			// Update user password
			user.password = hash
			await user.save()

			// // Send confirmation email
			// if (user.email) {
			// 	await MailService.sendMail(user.email, 'reset-confirmation', {})
			// }

			// Respond with success message
			res.status(200).json({
				success: true,
				message:
					'Password changed successfully. Please login with your new password.',
			})
		} catch (error) {
			console.error(
				`${chalk.red('Error during authenticated password reset:')} ${error}`
			)
			res.status(400).json({
				error: 'Your request could not be processed. Please try again.',
			})
		}
	}
)

export default router
