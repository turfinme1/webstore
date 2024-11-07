const nodemailer = require("nodemailer");
const { ASSERT } = require("../serverConfigurations/assert");

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  auth: null,
});

class EmailService {
  constructor(transporter) {
    this.transporter = transporter;
    this.sendVerificationEmail = this.sendVerificationEmail.bind(this);
    this.sendResetPasswordEmail = this.sendResetPasswordEmail.bind(this);
  }

  async sendVerificationEmail(data) {
    const verificationUrl = `http://localhost:3000/auth/verify-mail?token=${data.verifyToken}`;

    const templateResult = await data.dbConnection.query(`
      SELECT * FROM email_templates WHERE type = 'Email verification'`
    );
    const emailTemplate = templateResult.rows[0];
    const emailBody = emailTemplate.template.replace("{first_name}", data.user.first_name).replace("{last_name}", data.user.last_name).replace("{address}", `<a href="${verificationUrl}">Verify Email</a>`);

    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: data.user.email,
      subject: emailTemplate.subject,
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
  }

  async sendResetPasswordEmail(email, token) {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: email,
      subject: "Password Reset",
      text: `Please reset your password by clicking the following link: ${resetUrl}`,
      html: `<p>Please reset your password by clicking the following link:</p><a href="${resetUrl}">Reset Password</a>`,
    };

    await transporter.sendMail(mailOptions);
  }
}

module.exports = { EmailService, transporter };