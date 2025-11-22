import mongoose from 'mongoose'
import chalk from 'chalk'

import Keys from 'Config/Keys.js'

const { url } = Keys.database

/**
 * Sets up and connects to the MongoDB database.
 */
const setupDB = async (): Promise<void> => {
	try {
		// Connect to MongoDB using the URL from configuration
		await mongoose.connect(url as string)
		console.log(`${chalk.green('✓')} ${chalk.blue('MongoDB Connected!')}`)
	} catch (error) {
		console.error(
			`${chalk.red('✗')} ${chalk.blue('MongoDB Connection Error:')}`,
			error
		)
		// Exit process with failure
		process.exit(1)
	}
}

export default setupDB
