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
    this.sendOrderCreatedConfirmationEmail =
      this.sendOrderCreatedConfirmationEmail.bind(this);
    this.sendOrderPaidConfirmationEmail =
      this.sendOrderPaidConfirmationEmail.bind(this);
    this.sendResetPasswordEmail = this.sendResetPasswordEmail.bind(this);
  }

  async sendVerificationEmail(data) {
    const verificationUrl = `http://localhost:3000/auth/verify-mail?token=${data.verifyToken}`;

    const templateResult = await data.dbConnection.query(`
      SELECT * FROM email_templates WHERE type = 'Email verification'`);
    const emailTemplate = templateResult.rows[0];
    const emailBody = emailTemplate.template
      .replace("{first_name}", data.user.first_name)
      .replace("{last_name}", data.user.last_name)
      .replace("{address}", `<a href="${verificationUrl}">Verify Email</a>`);

    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: data.user.email,
      subject: emailTemplate.subject,
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
  }

  async sendOrderCreatedConfirmationEmail(data) {
    const templateResult = await data.dbConnection.query(`
      SELECT * FROM email_templates WHERE type = 'Order created'`);
    const emailTemplate = templateResult.rows[0];

    const userResult = await data.dbConnection.query(
      `
      SELECT * FROM users WHERE id = $1`,
      [data.session.user_id]
    );
    const user = userResult.rows[0];

    const appSettings = await data.dbConnection.query(`SELECT * FROM app_settings`);
    const vatPercentage = parseFloat(appSettings.rows[0].vat_percentage);
    const vatRate = vatPercentage / 100;
    const subtotal = data.cartItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const vatAmount = Math.floor((subtotal * vatRate) * 100) / 100;
    const totalPriceWithVAT = (subtotal + parseFloat(vatAmount)).toFixed(2);

    let orderTable = `
      <table style="border-collapse: collapse; width: 100%; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">
        <thead>
          <tr style="background-color: #f29191;">
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Product</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Quantity</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Price</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Total Price</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    data.cartItems.forEach((item) => {
      orderTable += `
        <tr>
          <td style="padding: 8px; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">${item.name}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">${item.quantity}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">$${item.unit_price}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">$${item.total_price}</td>
        </tr>
      `;
    });

    orderTable += `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">Subtotal:</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">VAT (${(vatRate * 100).toFixed(2)}%):</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${vatAmount}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">Total:</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${totalPriceWithVAT}</td>
      </tr>
    `;

    orderTable += `
        </tbody>
      </table>
    `;

    const emailBody = emailTemplate.template
      .replace("{first_name}", user.first_name)
      .replace("{last_name}", user.last_name)
      .replace("{order_number}", data.order.id)
      .replace("{order_table}", orderTable);
    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: user.email,
      subject: emailTemplate.subject,
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
  }

  async sendOrderPaidConfirmationEmail(data) {
    const templateResult = await data.dbConnection.query(`
      SELECT * FROM email_templates WHERE type = 'Order paid'`);
    const emailTemplate = templateResult.rows[0];

    const userResult = await data.dbConnection.query(
      `
      SELECT * FROM users WHERE id = $1`,
      [data.session.user_id]
    );
    const user = userResult.rows[0];

    const appSettings = await data.dbConnection.query(`SELECT * FROM app_settings`);
    const vatPercentage = parseFloat(appSettings.rows[0].vat_percentage);
    const vatRate = vatPercentage / 100;
    const subtotal = parseFloat(data.order.total_price);
    const vatAmount = Math.floor((subtotal * vatRate) * 100) / 100;
    const totalPriceWithVAT = (subtotal + parseFloat(vatAmount)).toFixed(2);

    let orderTable = `
      <table style="border-collapse: collapse; width: 100%; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">
        <thead>
          <tr style="background-color: #f29191;">
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Product</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Quantity</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Price</th>
            <th style="padding: 8px; text-align: left; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">Total Price</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.orderItems.forEach((item) => {
      orderTable += `
        <tr>
          <td style="padding: 8px; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">${item.product_name}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">${item.quantity}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">$${item.unit_price}</td>
          <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color};">$${item.total_price}</td>
        </tr>
      `;
    });

    orderTable += `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">Subtotal:</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">VAT (${(vatRate * 100).toFixed(2)}%):</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${vatAmount}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">Total:</td>
        <td style="padding: 8px; text-align: right; border: ${emailTemplate.table_border_width}px solid ${emailTemplate.table_border_color}; font-weight: bold;">$${totalPriceWithVAT}</td>
      </tr>
    `;

    orderTable += `
        </tbody>
      </table>
    `;

    const emailBody = emailTemplate.template
      .replace("{first_name}", user.first_name)
      .replace("{last_name}", user.last_name)
      .replace("{order_number}", data.order.id)
      .replace("{payment_number}", data.paymentNumber)
      .replace("{order_table}", orderTable);

    let mailOptions = {
      from: "no-reply@web-store4eto.com",
      to: user.email,
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
