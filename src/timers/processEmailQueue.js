const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");

(async () => {
    try {
        const emailService = new EmailService(transporter);
        emailService.processEmailQueue(pool);
        console.log("Cron job for processing email queue succeeded");
    } catch (error) {

    }
})();