require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

transporter.sendMail({
  from: process.env.EMAIL,
  to: process.env.EMAIL,
  subject: "Test Email",
  text: "This is a test email from Nodemailer"
}, (err, info) => {
  if (err) console.error("❌ Email sending failed:", err);
  else console.log("✅ Email sent:", info.response);
});
