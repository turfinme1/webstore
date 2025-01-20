const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const { ASSERT } = require('./assert');

const TEMPLATE_PATH = path.join(__dirname, 'templates');
const TEMPLATES = {
    ORDER_TABLE: 'orderTableTemplate',
};

class TemplateLoader {
    constructor() {
        this.templates = new Map();
    }

    async loadTemplate(templateName) {
        ASSERT(Object.values(TEMPLATES).includes(templateName), `Template ${templateName} not found`, { code: "SERVER_CONFIG.TEMPALTE_LOADER.00017.TEMPALTE_NOT_FOUND", long_description: `Template ${templateName} not found` });

        if (this.templates.has(templateName)) {
            return this.templates.get(templateName);
        }

        const templatePath = path.join(TEMPLATE_PATH, `${templateName}.hbs`);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        
        this.templates.set(templateName, template);
        return template;
    }
}

module.exports = {
    TemplateLoader,
    TEMPLATES,
}