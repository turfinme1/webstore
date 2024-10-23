const { validateQueryParams } = require("../serverConfigurations/validation");

class ExportController {
    constructor(exportService) {
        this.exportService = exportService;
        this.exportToCsv = this.exportToCsv.bind(this);
        this.exportToExcel = this.exportToExcel.bind(this);
    }

    async exportToCsv(req, res, next) {
        validateQueryParams(req, req.entitySchemaCollection[req.entitySchemaCollection[req.params.entity].queryValidationSchema]);
        const data = {
            req: req,
            query: req.query,
            params: req.params,
            entitySchemaCollection: req.entitySchemaCollection,
            dbConnection: req.dbConnection,
        };
        const result = await this.exportService.exportToCsv(data);
        res.status(200).json(result);
    }

    async exportToExcel(req, res, next) {
        validateQueryParams(req, req.entitySchemaCollection[req.entitySchemaCollection[req.params.entity].queryValidationSchema]);
        const data = {
            req: req,
            query: req.query,
            params: req.params,
            entitySchemaCollection: req.entitySchemaCollection,
            dbConnection: req.dbConnection,
        };
        const result = await this.exportService.exportToExcel(data);
        res.status(200).json(result);
    }  
}

module.exports = ExportController;