import type { StringValue } from 'ms'

export default {
    host: process.env.HOST as string, // Server host
    port: (process.env.PORT || 3000) as number, // Server port
    app: {
        name: process.env.APP_NAME as string, // Application name
        apiURL: process.env.BASE_API_URL as string, // Base API URL
    },
    database: {
        url: process.env.MONGO_URL as string, // MongoDB connection URL
    },
    jwt: {
        secret: process.env.JWT_SECRET as string, // JWT secret key
        tokenLife: process.env.JWT_LIFE as StringValue, // JWT token life
    },
    mqtt: {
        deviceId: process.env.DEVICE_ID as string, // Device ID to subscribe to
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
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN as string, // Telegram Bot Token
        chatId: process.env.TELEGRAM_CHAT_ID as string, // Telegram Chat ID
    },
    email: {
        user: process.env.EMAIL_USER as string, // Email user for SMTP
        pass: process.env.EMAIL_PASS as string, // Email password for SMTP
    },
}
