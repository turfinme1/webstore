class ReportController {
  constructor(reportService) {
    this.reportService = reportService;
    this.getOrdersByUserReport = this.getOrdersByUserReport.bind(this);
  }

  async getOrdersByUserReport(req, res, next) {
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.reportService.getOrdersByUserReport(data);
    res.status(200).json(result);
  }
}

module.exports = ReportController;
