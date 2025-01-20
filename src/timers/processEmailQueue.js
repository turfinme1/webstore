const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");

(async () => {
    let client;
    let logger;

    try {
        const templateLoader = new TemplateLoader();
        const emailService = new EmailService(transporter, templateLoader);
        await emailService.processEmailQueue(pool);

        client = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });
        await logger.info({
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Email queue process completed',
            long_description: 'Email queue process completed'
        });
    } catch (error) {
        if(logger) await logger.error(error);
    } finally {
        if (client) client.release();
    }
})();