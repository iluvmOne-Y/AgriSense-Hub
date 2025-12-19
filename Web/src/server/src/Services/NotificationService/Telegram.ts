import axios from 'axios'
import chalk from 'chalk'

import { SensorData } from 'Shared/Data/Types/index.js'
import Keys from 'Server/Config/Keys.js'

/**
 * Hàm gửi thông báo qua Telegram
 *
 * @param message Nội dung tin nhắn muốn gửi (Hỗ trợ HTML tag như <b>, <i>)
 */
export const sendTelegramAlert = async (data: {
	warnings: string[]
	sensorData: SensorData
}) => {
	const warnings = data.warnings as string[]
	const sensor = data.sensorData as SensorData

	// Generate message content
	const message =
		`[Farm Alert] Critical levels detected: ${warnings.join(', ')}. ` +
		`T:${sensor.temperature}C, H:${sensor.humidity}%, M:${sensor.moisture}%. ` +
		`Check immediately!`

	const url = `https://api.telegram.org/bot${Keys.telegram.botToken}/sendMessage`
	try {
		await axios.post(url, {
			chat_id: Keys.telegram.chatId,
			text: message,
			parse_mode: 'HTML',
		})
		console.log(chalk.green('✓ Đã gửi tin nhắn Telegram thành công!'))
	} catch (error: any) {
		console.error(chalk.red('✗ Lỗi gửi Telegram:'), error.message)
	}
}

export default sendTelegramAlert
