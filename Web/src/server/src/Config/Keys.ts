export default {
	app: {
		name: process.env.APP_NAME as string, // Application name
		apiURL: process.env.BASE_API_URL as string, // Base API URL
		clientURL: process.env.CLIENT_URL as string, // Client URL
	},
	port: (process.env.PORT || 3000) as number, // Server port
	certs: {
		certPath: process.env.CERT_PATH as string, // Path to SSL certificate
		keyPath: process.env.KEY_PATH as string, // Path to SSL key
	},
	database: {
		url: process.env.MONGO_URL as string, // MongoDB connection URL
	},
	jwt: {
		secret: process.env.JWT_SECRET as string, // JWT secret key
		tokenLife: process.env.JWT_LIFE as string, // JWT token life
	},
	mqtt: {
		certPath: process.env.MQTT_CERT_PATH as string, // Path to MQTT CA certificate
		host: process.env.MQTT_HOST as string, // MQTT broker host
		port: process.env.MQTT_PORT as unknown as number, // MQTT broker port
		user: process.env.MQTT_USER as string, // MQTT username
		pass: process.env.MQTT_PASS as string, // MQTT password
	},
	mailgun: {
		key: process.env.MAILGUN_API_KEY as string, // Mailgun API key
		domain: process.env.MAILGUN_DOMAIN as string, // Mailgun domain
		sender: process.env.MAILGUN_SENDER as string, // Mailgun sender email
	},
	textbee: {
		apiKey: process.env.TEXTBEE_API_KEY as string, // Text-Bee API key
	},
}
