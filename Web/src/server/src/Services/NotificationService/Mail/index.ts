import chalk from 'chalk'
import nodemailer from 'nodemailer';
import Keys from 'Server/Config/Keys.js'


// // Extract api key and domain for mailgun
// const { key, domain, sender } = Keys.mailgun

// /**
//  * Handle mail sending via Mailgun
//  *
//  * @server
//  * @class MailService
//  */
// const MailService = {
//     mailgun: new Mailgun(FormData).client({
//         username: 'api',
//         key: key,
//     }), // Mailgun client instance for sending emails

//     /**
//      * Send an email using Mailgun
//      *
//      * @param email - Recipient email address
//      * @param type - Type of email to send
//      * @param data - Data for the email template
//      * @returns Promise resolving to Mailgun response or error
//      */
//     async sendMail(email: string, type: string, data: any): Promise<any> {
//         try {
//             // Prepare email template
//             const config = GetTemplate(type, data)
//             if (!config) {
//                 throw new Error('Failed to prepare email template')
//             }

//             // Add sender and recipient to the email config
//             config.from = `Online Auction! <no-reply@<${sender}>>`
//             config.to = email

//             // Send email via Mailgun
//             return await MailService.mailgun.messages.create(domain, config)
//         } catch (error) {
//             console.log(`${chalk.red('✗ MailService.sendMail error:')} `, error)
//             return error
//         }
//     },
// }

// export default MailService
//Email trung gian
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: Keys.email.user,
        pass: Keys.email.pass,
    },
});

/**
 * 
 * @param toEmail Địa chỉ email người nhận
 * @param subject Tiêu đề
 * @param htmlContent Nội dung HTML
 */
export const sendEmail = async (toEmail: string, subject: string, htmlContent: string) => {
    const mailOptions = {
        from: `"AgriHub System" <${Keys.email.user}>`, 
        to: toEmail, 
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(chalk.green(`✓ Đã gửi mail tới: ${toEmail}`));
        return true;
    } catch (error: any) {
        console.error(chalk.red(`✗ Lỗi gửi tới ${toEmail}:`), error.message);
        return false;
    }
};

export default sendEmail