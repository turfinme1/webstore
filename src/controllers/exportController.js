const { validateQueryParams } = require("../serverConfigurations/validation");

class ExportController {
    constructor(exportService) {
        this.exportService = exportService;
        this.exportToCsv = this.exportToCsv.bind(this);
        this.exportToExcel = this.exportToExcel.bind(this);
    }

    async exportToCsv(req, res, next) {
        validateQueryParams(req, req.entitySchemaCollection[req.entitySchemaCollection[req.params.entity]?.queryValidationSchema]);
        const data = {
            res: res,
            query: req.query,
            params: req.params,
            entitySchemaCollection: req.entitySchemaCollection,
            dbConnection: req.dbConnection,
        };
        await this.exportService.exportToCsv(data);
    }

    async exportToExcel(req, res, next) {
        validateQueryParams(req, req.entitySchemaCollection[req.entitySchemaCollection[req.params.entity]?.queryValidationSchema]);
        const data = {
            res: res,
            query: req.query,
            params: req.params,
            entitySchemaCollection: req.entitySchemaCollection,
            dbConnection: req.dbConnection,
        };
        await this.exportService.exportToExcel(data);
    }  
}

module.exports = ExportController;