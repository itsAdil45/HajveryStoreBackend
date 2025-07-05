const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER, // your Gmail
                pass: process.env.EMAIL_PASS, // your app password
            },
        });

        await transporter.sendMail({
            from: `"Hajvery Super Store" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });

        console.log(`✅ Email sent to ${to}`);
    } catch (err) {
        console.error("❌ Email sending failed:", err.message);
        throw new Error("Failed to send email");
    }
};

module.exports = sendEmail;
