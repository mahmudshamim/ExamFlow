const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

console.log('--- SMTP Verification Start ---');
console.log('User:', process.env.GMAIL_USER);
console.log('Pass:', process.env.GMAIL_PASS ? '********' : 'MISSING');

transporter.verify(function (error, success) {
    if (error) {
        console.log('CRITICAL: SMTP Verification Failed');
        console.error(error);
    } else {
        console.log('SMTP Server is ready to take our messages');

        const mailOptions = {
            from: `"Email Test" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send to self
            subject: 'ExamFlow Email Test',
            text: 'If you receive this, the SMTP configuration is working!'
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log('Error sending test email:');
                console.error(err);
            } else {
                console.log('Test email sent successfully!');
                console.log('Message ID:', info.messageId);
                console.log('Response:', info.response);
            }
            process.exit();
        });
    }
});
