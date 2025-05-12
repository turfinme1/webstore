const { validateQueryParams } = require("../serverConfigurations/validation");

class ExportController {
    constructor(exportService) {
        this.exportService = exportService;
       
    }

    exportToCsv = async (req, res, next) => {
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

    exportToExcel = async (req, res, next) => {
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