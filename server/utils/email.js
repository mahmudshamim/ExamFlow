const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    pool: true,              // Enable connection pooling
    maxConnections: 5,       // Use up to 5 simultaneous connections
    maxMessages: 100,        // Send max 100 messages per connection
    rateDelta: 1000,         // 1 second between messages
    rateLimit: 5             // Max 5 messages per rateDelta
});

const sendResultEmail = async (to, employeeName, assessmentTitle, score, totalMarks, questions = [], answers = []) => {
    try {
        // Generate question breakdown HTML
        let questionBreakdownHTML = '';

        if (questions.length > 0 && answers.length > 0) {
            questionBreakdownHTML = `
                <div style="margin: 30px 0;">
                    <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Question Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
                        <thead>
                            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">#</th>
                                <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Question</th>
                                <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Marks</th>
                                <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            questions.forEach((question, index) => {
                const answer = answers.find(a => a.questionId.toString() === question._id.toString());
                const marksObtained = answer?.marksObtained || 0;
                const isCorrect = marksObtained > 0;
                const isPending = !answer?.isGraded;

                // Truncate question text if too long
                const questionText = question.text.length > 60
                    ? question.text.substring(0, 60) + '...'
                    : question.text;

                // Determine status icon and color
                let statusIcon, statusColor, statusBg;
                if (isPending) {
                    statusIcon = '⏳';
                    statusColor = '#f59e0b';
                    statusBg = '#fef3c7';
                } else if (isCorrect) {
                    statusIcon = '✓';
                    statusColor = '#10b981';
                    statusBg = '#d1fae5';
                } else {
                    statusIcon = '✗';
                    statusColor = '#ef4444';
                    statusBg = '#fee2e2';
                }

                questionBreakdownHTML += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px; color: #64748b; font-weight: 600; font-size: 14px;">${index + 1}</td>
                        <td style="padding: 12px; color: #1e293b; font-size: 14px;">${questionText}</td>
                        <td style="padding: 12px; text-align: center; color: #1e293b; font-weight: 600; font-size: 14px;">
                            <span style="color: ${isCorrect ? '#10b981' : (isPending ? '#64748b' : '#ef4444')};">${marksObtained}</span> / ${question.marks}
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: ${statusColor}; background-color: ${statusBg};">
                                ${statusIcon} ${isPending ? 'Pending' : (isCorrect ? 'Correct' : 'Incorrect')}
                            </span>
                        </td>
                    </tr>
                `;
            });

            questionBreakdownHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        const mailOptions = {
            from: `"ExamFlow Corporate" <${process.env.GMAIL_USER}>`,
            to,
            ...(process.env.HR_EMAIL ? { cc: process.env.HR_EMAIL } : {}),
            subject: `${assessmentTitle} - Assessment Result`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">Khulna Technologies LLC</h1>
                        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; font-size: 32px; margin: 0 0 20px 0; font-weight: 700; text-align: center;">Assessment Result</h2>
                        
                        <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                            Hello <strong style="color: #1e293b;">${employeeName}</strong>, you've completed your exam. Here's a summary of your performance.
                        </p>

                        <!-- Final Score Box -->
                        <div style="background: linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 100%); padding: 30px; border-radius: 16px; text-align: center; margin: 30px 0;">
                            <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 10px 0;">FINAL SCORE</p>
                            <p style="font-size: 56px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                ${score} <span style="font-size: 36px; color: #cbd5e1;">/ ${totalMarks}</span>
                            </p>
                        </div>

                        ${questionBreakdownHTML}

                        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                            Best regards,<br/>
                            <strong style="color: #1e293b;">Khulna Technologies LLC</strong><br/>
                            <span style="font-size: 12px; color: #94a3b8;">Excellence in Technology Solutions</span>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} - EXAMFLOW</p>
                    </div>
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
