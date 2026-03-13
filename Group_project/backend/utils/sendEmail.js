const nodemailer = require('nodemailer');

const sendVerificationEmail = async (userEmail, verificationUrl) => { 
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Helps avoid certificate issues on cloud hosts
            }
        });

        const mailOptions = {
            from: `"CropAI Intelligence" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Verify Your Farmer Account - CropAI',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                    <h2 style="color: #2ecc71;">Welcome to CropAI! 🌱</h2>
                    <p>Thank you for joining our community. Please verify your email to access your dashboard.</p>
                    <a href="${verificationUrl}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">Verify My Account</a>
                    <p style="margin-top: 20px; color: #7f8c8d; font-size: 12px;">This link will expire in 1 hour.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Verification email sent to ${userEmail}`);
    } catch (error) {
        console.error('Email sending failed:', error);
        // We don't throw an error here so the user registration isn't blocked if email fails
    }
};

module.exports = sendVerificationEmail;
