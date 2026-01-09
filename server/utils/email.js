const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use SMTP settings from .env
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

const sendResultEmail = async (to, employeeName, assessmentTitle, score, totalMarks) => {
    try {
        const mailOptions = {
            from: `"ExamFlow Corporate" <${process.env.GMAIL_USER}>`,
            to,
            ...(process.env.HR_EMAIL ? { cc: process.env.HR_EMAIL } : {}),
            subject: `${assessmentTitle} Result`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #0d9488;">Assessment Result</h2>
                    <p>Hello <strong>${employeeName}</strong>,</p>
                    <p>Thank you for completing the exam. Here is your score:</p>
                    <div style="background-color: #f0fdfa; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; color: #0f766e; font-weight: bold;">Score: ${score} / ${totalMarks}</span>
                    </div>
                    <p>Best regards,<br/>
                    <strong>Rajulaw IT Team</strong><br/>
                    <small>(Powered by Khulna Technologies)</small></p>
                </div>
            `
        };

        console.log(`Attempting to send email to: ${to} for assessment: ${assessmentTitle}`);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        console.log('Server response:', info.response);
        return true;
    } catch (error) {
        console.error('CRITICAL: Error sending email via Nodemailer:');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response) console.error('SMTP Response:', error.response);
        return false;
    }
};

module.exports = { sendResultEmail };
