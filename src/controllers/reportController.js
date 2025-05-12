class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
  }

  getReport = async (req, res, next) => {
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };
    const result = await this.reportService.getReport(data);
    res.status(200).json(result);
  }

  exportReport = async (req, res, next) => {
    const data = {
      res: res,
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
    };
    const result = await this.reportService.exportReport(data);
    res.status(200).json(result);
  }

  getAllReports = async (req, res, next) => {
    const result = await this.reportService.getAllReports();
    res.status(200).json(result);
  }
}

module.exports = ReportController;
