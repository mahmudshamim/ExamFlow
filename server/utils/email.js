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
                <!-- Question Breakdown Section -->
                <div style="padding: 30px 40px; border-top: 1px solid #f1f5f9; background-color: #ffffff;">
                    <div style="font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 20px;">Question Breakdown</div>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #f1f5f9;">
                                <th style="padding: 12px 8px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">#</th>
                                <th style="padding: 12px 8px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Question</th>
                                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Marks</th>
                                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            questions.forEach((question, index) => {
                const answer = answers.find(a => a.questionId.toString() === question._id.toString());
                const marksObtained = answer?.marksObtained || 0;
                const isCorrect = marksObtained > 0;
                const isPending = !answer?.isGraded;

                // Use full question text
                const questionText = question.text;

                // Determine status badge
                let statusBadge;
                if (isPending) {
                    statusBadge = `<span style="display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #f59e0b; background-color: #fef3c7;">⏳ Pending</span>`;
                } else if (isCorrect) {
                    statusBadge = `<span style="display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #10b981; background-color: #d1fae5;">✓ Correct</span>`;
                } else {
                    statusBadge = `<span style="display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #ef4444; background-color: #fee2e2;">✗ Incorrect</span>`;
                }

                questionBreakdownHTML += `
                    <tr style="border-bottom: 1px solid #f8fafc;">
                        <td style="padding: 14px 8px; color: #94a3b8; font-weight: 600; font-size: 13px;">${index + 1}</td>
                        <td style="padding: 14px 8px; color: #1e293b; font-size: 13px; line-height: 1.5;">${questionText}</td>
                        <td style="padding: 14px 8px; text-align: center; font-weight: 700; font-size: 14px;">
                            <span style="color: ${isCorrect ? '#10b981' : (isPending ? '#64748b' : '#ef4444')};">${marksObtained}</span><span style="color: #cbd5e1;"> / ${question.marks}</span>
                        </td>
                        <td style="padding: 14px 8px; text-align: center;">
                            ${statusBadge}
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
                <!DOCTYPE html>
                <html>
                <head>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
                </head>
                <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0;">
                    <div style="width: 100%; padding: 40px 20px;">
                        <div style="width: 95%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                            
                            <!-- Brand Header -->
                            <div style="padding: 40px 40px 20px 40px; text-align: center;">
                                <div style="font-size: 22px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px;">Khulna Technologies LLC</div>
                                <div style="font-size: 13px; color: #94a3b8; margin-top: 5px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>

                            <!-- Assessment Hero -->
                            <div style="padding: 0 40px 30px 40px; text-align: center;">
                                <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 10px 0;">Assessment Result</h1>
                                <p style="color: #64748b; font-size: 15px; margin: 10px 0;">
                                    Hello <strong style="color: #1e293b;">${employeeName}</strong>, you've completed your exam. Here's a summary of your performance.
                                </p>
                                
                                <!-- Score Card -->
                                <table style="width: 100%; background: #f1f5f9; border-radius: 16px; margin: 20px 0; border: 1px solid #e2e8f0; border-collapse: separate;">
                                    <tr>
                                        <td style="padding: 25px 30px; text-align: left; vertical-align: middle;">
                                            <span style="font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Final Score</span>
                                        </td>
                                        <td style="padding: 25px 30px; text-align: right; vertical-align: middle;">
                                            <span style="font-size: 36px; font-weight: 800; color: #6366f1;">${score} <span style="font-size: 24px; color: #cbd5e1; font-weight: 700;">/ ${totalMarks}</span></span>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            ${questionBreakdownHTML}

                            <!-- Footer -->
                            <div style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
                                <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                                    Best regards,<br>
                                    <strong style="color: #475569;">Khulna Technologies LLC</strong><br>
                                    <span style="font-size: 11px;">Excellence in Technology Solutions</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </body>
                </html>
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
