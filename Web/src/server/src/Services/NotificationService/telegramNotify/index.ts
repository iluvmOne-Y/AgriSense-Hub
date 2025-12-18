    import axios from 'axios'
    import chalk from 'chalk';
    import { send } from 'process';
    import Keys from 'Server/Config/Keys.js'
   
    // /**
    //  * Handle SMS sending 
    //  *
    //  * @server
    //  * @class SmsService
    //  */
    // const SmsService = {
    //     /**
    //      * Send SMS 
    //      *
    //      * @param recipients - Array of recipient phone numbers
    //      * @param message - Message content to send
    //      * @returns Promise resolving to Text-Bee response or error
    //      */
    //     async sendSMS(recipients: string[], message: string) {
    //         try {
    //             const response = await axios.post(
    //                 'https://api.textbee.dev/api/v1/gateway/devices/{YOUR_DEVICE_ID}/send-sms',
    //                 {
    //                     recipients: recipients,
    //                     message: message,
    //                 },
    //                 {
    //                     headers: {
    //                         'x-api-key': Keys.textbee.apiKey,
    //                     },
    //                 }
    //             )
    //             console.log('SMS Sent:', response.data)
    //             return response.data
    //         } catch (error) {
    //             console.error('Error sending SMS:', error)
    //             return error
    //         }
    //     },
    // }

    /**
     * Hàm gửi thông báo qua Telegram
     * @param message Nội dung tin nhắn muốn gửi (Hỗ trợ HTML tag như <b>, <i>)
     */
    export const sendTelegramAlert = async (message: string) => {
        console.log('DEBUG TOKEN:', Keys.telegram.botToken); 
        console.log('DEBUG CHAT_ID:', Keys.telegram.chatId);
        const url = `https://api.telegram.org/bot${Keys.telegram.botToken}/sendMessage`;
        try {
            await axios.post(url, {
                chat_id: Keys.telegram.chatId,
                text: message,
                parse_mode: 'HTML' 
            });
            console.log(chalk.green('✓ Đã gửi tin nhắn Telegram thành công!'));
        } catch (error: any) {
            console.error(chalk.red('✗ Lỗi gửi Telegram:'), error.message);
        }
    };

    export default sendTelegramAlert;