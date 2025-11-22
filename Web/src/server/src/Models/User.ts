import { Schema, model, Document } from 'mongoose'
import { ROLES, EMAIL_PROVIDER } from 'Data/Constants/index.js'

/**
 * Interface representing a User document in MongoDB.
 *
 * @interface IUser
 * @property {string} email - The user's email address.
 * @property {string} [password] - The user's password (optional for OAuth users).
 * @property {string} provider - The authentication provider (e.g., Email, Google).
 * @property {string} firstName - The user's first name.
 * @property {string} lastName - The user's last name.
 * @property {string} role - The user's role in the system.
 * @property {boolean} isActive - Indicates if the user's account is active.
 * @property {string} [resetPasswordToken] - Token for password reset (optional).
 * @property {Date} [resetPasswordExpires] - Expiration date for the reset token (optional).
 */
export interface IUser extends Document {
	email: string
	password?: string
	provider: string
	firstName: string
	lastName: string
	role: string
	isActive: boolean
	resetPasswordToken?: string
	resetPasswordExpires?: Date
}

/**
 * Mongoose schema for the User model.
 */
const UserSchema = new Schema(
	{
		email: { type: String, required: true, unique: true, trim: true },
		password: { type: String },
		provider: {
			type: String,
			required: true,
			default: EMAIL_PROVIDER.Email,
		},
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		role: {
			type: String,
			default: ROLES.User,
			enum: Object.values(ROLES),
		},
		isActive: { type: Boolean, default: true },
		resetPasswordToken: { type: String },
		resetPasswordExpires: { type: Date },
	},
	{ timestamps: true }
)

export default model('User', UserSchema)
