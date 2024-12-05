const nodemailer = require("nodemailer");
const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");
const { STATUS_CODES, ENV }  = require("../serverConfigurations/constants");

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  auth: null,
});

class EmailService {
    constructor(transporter) {
        this.transporter = transporter;
        this.sendTestEmail = this.sendTestEmail.bind(this);
        this.previewEmail = this.previewEmail.bind(this);
    }

    async sendEmail(data) {
        ASSERT(data.from, "Missing email sender", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email sender" });
        ASSERT(data.to, "Missing email recipient", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email recipient" });
        ASSERT(data.subject, "Missing email subject", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email subject" });
        ASSERT(data.html, "Missing email body", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email body" });
          
        return await this.transporter.sendMail(data);
    }

    async sendTestEmail(data) {
        const emailOptions = await this.prepareTestEmailData(data);
        await this.sendEmail(emailOptions);
        return { message: "Test email sent successfully" };
    }

    async previewEmail(data) {
        const emailOptions = await this.prepareTestEmailData(data);
        return emailOptions.html;
    }

    async prepareTestEmailData(data){
        let emailData = {
            templateType: null,
            recipient: null,
            first_name: null,
            last_name: null,
        };

        const userResult = await data.dbConnection.query(
            `SELECT * FROM admin_users WHERE id = $1`,
            [data.session.admin_user_id]
        );
        emailData.recipient = userResult.rows[0].email;
        emailData.first_name = userResult.rows[0].first_name;
        emailData.last_name = userResult.rows[0].last_name;

        if (data.params.type === "email-verification") {
            emailData.templateType = "Email verification";
            emailData.address = `<a href="${ENV.DEVELOPMENT_URL}/auth/verify-mail?token=RANDOMLY_GENERATED_TOKEN">Verify Email</a>`;
        } else if (data.params.type === "order-created" || data.params.type === "order-paid") {
            emailData.templateType = data.params.type === "order-created" ? "Order created" : "Order paid";
            emailData.order_number = "ORDER-123456789";
            emailData.payment_number = "PAYMENT-123456789";
            emailData.order_table = {
                id: 1,
                order_items: [
                    { name: "Product 1", quantity: 2, unit_price: 10.00, total_price: 20.00 },
                    { name: "Product 2", quantity: 1, unit_price: 5.00, total_price: 5.00 }
                ],
                total_price: 25.00,
                discount_percentage: 10,
                discount_amount: 2.50,
                total_price_after_discount: 22.50,
                vat_percentage: 20,
                vat_amount: 4.50,
                total_price_with_vat: 27.00
            }; 
        } else if (data.params.type === "forgot-password") {
            emailData.templateType = "Forgot password";
            emailData.address = `<a href="${ENV.DEVELOPMENT_URL}/reset-password?token=RANDOMLY_GENERATED_TOKEN">Reset Password</a>`;
        } else {
            ASSERT_USER(false, "Invalid email type", { code: STATUS_CODES.INVALID_QUERY_PARAMS, long_description: `Invalid email type: ${data.params.type}` });
        }

        const emailOptions = await this.processTemplate({ emailData, dbConnection: data.dbConnection });
        return emailOptions;
    }

    async queueEmail(data) {
        ASSERT(data.dbConnection, "Missing database connection", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing database connection" });
        ASSERT(data.emailData, "Missing email data", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email data" });
        ASSERT(data.emailData.templateType, "Missing email template type", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email template type" });
        ASSERT(data.emailData.recipient, "Missing email recipient", { code: STATUS_CODES.INVALID_INPUT, long_description: "Missing email recipient" });

        const emailRecord = await data.dbConnection.query(
            `INSERT INTO emails (template_type, data_object) 
             VALUES ($1, $2) 
             RETURNING *`,
            [data.emailData.templateType, data.emailData]
        );

        return emailRecord.rows[0];
    }

    async processTemplate(data) {
        const emailTemplateResult = await data.dbConnection.query(
            `SELECT * FROM email_templates WHERE type = $1`,
            [data.emailData.templateType]
        );
        ASSERT(emailTemplateResult.rows.length === 1, "Template not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Template not found" });
        const emailTemplate = emailTemplateResult.rows[0];
        
        let emailBody = emailTemplate.template;
        for (const placeholder of emailTemplate.placeholders) {
            let placeholderKey = placeholder.replace(/[{}]/g, "");
            ASSERT(data.emailData.hasOwnProperty(placeholderKey), "Missing email template placeholder", { code: STATUS_CODES.INVALID_INPUT, long_description: `"Missing email template placeholder: ${placeholderKey}` });
            
            if(placeholderKey === "order_table") {
                const htmlTable = this.buildOrderTable({ order: data.emailData[placeholderKey], emailTemplate});
                emailBody = emailBody.replace(`${placeholder}`, htmlTable);
            } else {
                emailBody = emailBody.replace(`${placeholder}`, data.emailData[placeholderKey]);
            }
        }

        return { 
            from: "no-reply@web-store4eto.com",
            to: data.emailData.recipient,
            subject: emailTemplate.subject,
            html: emailBody
        };
    }

    async processEmailQueue(pool) {
        let dbConnection;
        let emailId;
        try {
            dbConnection = await pool.connect();
            const pendingEmails = await dbConnection.query(
                `SELECT * FROM emails 
                WHERE status = 'queued' 
                AND (last_attempt IS NULL OR last_attempt > NOW() - INTERVAL '25 minutes')
                AND attempts < 3
                ORDER BY created_at ASC`
            );
            
            for (const email of pendingEmails.rows) {
                emailId = email.id;
                const emailOptions = await this.processTemplate({ emailData: email.data_object, dbConnection });
                await this.sendEmail(emailOptions);
                await dbConnection.query(
                    `UPDATE emails 
                    SET status = 'sent', sent_at = NOW() 
                    WHERE id = $1`,
                    [email.id]
                );
            }
        } catch (error) {
            await dbConnection.query(
                `UPDATE emails 
                SET attempts = attempts + 1, last_attempt = NOW() 
                WHERE id = $1`,
                [emailId]
            );
        } finally {
            if(dbConnection){
                dbConnection.release();
            }
        }
    }

    buildOrderTable(data) {
        let orderTable = `
            <table style="border-collapse: collapse; width: 100%; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">
                <thead>
                    <tr style="background-color: #f29191;">
                        <th style="padding: 8px; text-align: left; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">Product</th>
                        <th style="padding: 8px; text-align: left; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">Quantity</th>
                        <th style="padding: 8px; text-align: left; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">Price</th>
                        <th style="padding: 8px; text-align: left; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">Total Price</th>
                    </tr>
                </thead>
            <tbody>
        `;
        
        for (const item of data.order.order_items) {
            orderTable += `
                <tr>
                <td style="padding: 8px; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">${item.name}</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">${item.quantity}</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">${this.formatCurrency(item.unit_price)}</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color};">${this.formatCurrency(item.total_price)}</td>
                </tr>
            `;
        };

        orderTable += `
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">Subtotal:</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">${this.formatCurrency(data.order.total_price)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">Discount (${data.order.discount_percentage}%):</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">${this.formatCurrency(data.order.discount_amount)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">Price after discount:</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">${this.formatCurrency(data.order.total_price_after_discount)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">VAT (${data.order.vat_percentage}%):</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">${this.formatCurrency(data.order.vat_amount)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">Total:</td>
                <td style="padding: 8px; text-align: right; border: ${data.emailTemplate.table_border_width}px solid ${data.emailTemplate.table_border_color}; font-weight: bold;">${this.formatCurrency(data.order.total_price_with_vat)}</td>
            </tr>
        `;

        orderTable += `
            </tbody>
        </table>
        `;

        return orderTable;
    }

    formatCurrency(number) {
        if(!number) {
          return '$0.00';
        }
        return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(number)).replace(',', '.')}`;
    }
}

module.exports = { EmailService, transporter };