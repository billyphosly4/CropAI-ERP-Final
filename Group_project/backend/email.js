require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log("Attempting to connect to email server...");
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Change this if using your custom domain
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.verify();
        console.log("✅ Server is ready to take our messages");

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: "kipkoechlamartine@gmail.com", // Sending to yourself for the test
            subject: "CropAI - Test Email",
            text: "If you see this, Nodemailer is working perfectly!"
        });

        console.log("✅ Test email sent successfully!");
    } catch (error) {
        console.error("❌ Email Test Failed:");
        console.error(error);
    }
};

testEmail();