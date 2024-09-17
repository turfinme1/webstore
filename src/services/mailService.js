const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  auth: null,
});

class MailService {
  constructor(transporter) {
    this.transporter = transporter;
    this.sendVerificationEmail = this.sendVerificationEmail.bind(this);
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `http://localhost:3601/auth/verify-mail?token=${token}`;
    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: email,
      subject: "Email Verification",
      text: `Please verify your email by clicking the following link: ${verificationUrl}`,
      html: `<p>Please verify your email by clicking the following link:</p><a href="${verificationUrl}">Verify Email</a>`,
    };

    await transporter.sendMail(mailOptions);
  }
}

module.exports = { MailService, transporter };