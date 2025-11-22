/**
 * Defines the roles for users in the system.
 *
 * @enum {string} ROLES
 * @property {string} Admin - Administrator with full access
 * @property {string} User - Regular logged-in user
 * @property {string} Guest - Non-logged-in user
 */
export enum ROLES {
	Admin = 'ROLE ADMIN',
	User = 'ROLE USER',
	Guest = 'ROLE GUEST',
}

/**
 * Defines the email providers supported for user authentication.
 *
 * @enum {string} EMAIL_PROVIDER
 * @property {string} Email - Standard email provider
 * @property {string} Google - Google authentication provider
 */
export enum EMAIL_PROVIDER {
	Email = 'Email',
	Google = 'Google',
}

/**
 * Defines the possible IoT device actions.
 *
 * @enum {string} IoTAction
 * @property {string} Start - Action to start the device
 * @property {string} Stop - Action to stop the device
 * @property {string} On - Action to turn the device on
 */
export enum IoTAction {
	Start = 'START',
	Stop = 'STOP',
	On = 'ON',
}

/**
 * Name of the JWT cookie used for authentication.
 *
 * @constant {string} JWT_COOKIE
 */
export const JWT_COOKIE = 'x-jwt-cookie'
