class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
    this.getReport = this.getReport.bind(this);
    this.exportReport = this.exportReport.bind(this);
  }

  async getReport(req, res, next) {
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.reportService.getReport(data);
    res.status(200).json(result);
  }

  async exportReport(req, res, next) {
    const data = {
      res: res,
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.reportService.exportReport(data);
    res.status(200).json(result);
  }
}

module.exports = ReportController;
