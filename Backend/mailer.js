const nodemailer = require("nodemailer");
require("dotenv").config(); // Load your .env variables

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,  // your Gmail address from .env
    pass: process.env.GMAIL_PASS   // your Gmail app password from .env
  }
});

async function sendEmail(to, subject, text) {
  const mailOptions = { from: process.env.GMAIL_USER, to, subject, text };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
}

module.exports = sendEmail;
