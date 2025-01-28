const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateObject } = require("../serverConfigurations/validation");

class ReportService {
  constructor(exportService) {
    this.exportService = exportService;
    this.reports = {
        "report-orders-by-user": this.ordersByUserReportDefinition.bind(this),
        "report-logs": this.logsReportDefinition.bind(this),
        "report-orders": this.ordersReportDefinition.bind(this),
        "report-users": this.usersReportDefinition.bind(this),
    }
    this.dashboardReports = {
        "store-trends": this.storeTrendsReportDefinition.bind(this),
        "campaign-trends": this.campaignTrendsReportDefinition.bind(this),
    }
  }

  async getReport(data) {
    if(this.reports[data.params.report]) {
        const reportDefinition = await this.reports[data.params.report](data);
        validateObject(reportDefinition.reportUIConfig, data.entitySchemaCollection["reportUI"]);
        if(data.body.metadataRequest === true) {
            return reportDefinition;
        }

        const replacedQueryData = this.replaceFilterExpressions(reportDefinition.sql, reportDefinition.reportFilters, data.body);
        let displayRowLimit = parseInt(data.context.settings.report_row_limit_display);
        const result = await data.dbConnection.query(`${replacedQueryData.sql} LIMIT ${displayRowLimit + 1}`, replacedQueryData.insertValues);
        const overRowDisplayLimit = result.rows.length === displayRowLimit + 1;
        if(result.rows.length > 0){
            result.rows.push(result.rows.shift());
        }
        return { rows: result.rows, overRowDisplayLimit };
    } else if (this.dashboardReports[data.params.report]) {
        const reportDefinition = await this.dashboardReports[data.params.report](data);
        const replacedQueryData = this.replaceFilterExpressions(reportDefinition.sql, reportDefinition.reportFilters, data.body);
    
        const result = await data.dbConnection.query(replacedQueryData.sql, replacedQueryData.insertValues);
        return { rows: result.rows };
    } else {
        ASSERT_USER(false, `Report ${data.params.report} not found`, {
            code: "SERVICE.REPORT.00042.INVALID_QUERY_PARAMS",
            long_description: `Report ${data.params.report} not found`
        });
    }
  }

  async exportReport(data) {
    ASSERT_USER(this.reports[data.params.report], `Report ${data.params.report} not found`, { 
        code: "SERVICE.REPORT.00051.INVALID_QUERY_PARAMS", 
        long_description: `Report ${data.params.report} not found` 
    });

    const reportDefinition = await this.reports[data.params.report](data);
    const replacedQueryData = this.replaceFilterExpressions(reportDefinition.sql, reportDefinition.reportFilters, data.body);
    const reportMetadata = this.formatReportMetadata(reportDefinition.reportFilters, data.body);
    const exportData = {
        res : data.res,
        format: data.params.format,
        filename: `report`,
        query: replacedQueryData.sql,
        values: replacedQueryData.insertValues,
        filters: reportMetadata.filters,
        groupings: reportMetadata.groupings,
        params: data.params,
        dbConnection: data.dbConnection,
    };

    await this.exportService.exportReport(exportData);
  }

  replaceFilterExpressions(sql, reportFilters, INPUT_DATA) {
    let insertValues = [];
    const hasAnyGrouping = reportFilters.some(filter =>INPUT_DATA[`${filter.key}_grouping_select_value`]);

    for (let reportFilter of reportFilters) {
      const groupingValue = INPUT_DATA[`${reportFilter.key}_grouping_select_value`];
      let groupingExpr = "'All'"; // default

      if (groupingValue) {
        if (reportFilter.type === 'timestamp') {
          ASSERT_USER(groupingValue.match(/minute|hour|day|week|month|year/), `Invalid grouping value ${groupingValue}`, { code: "SERVICE.REPORT.00083.INVALID_BODY", long_description: `Invalid grouping value ${groupingValue}` });
          groupingExpr = `DATE_TRUNC('${groupingValue}', ${reportFilter.grouping_expression})`;
        } else {
          groupingExpr = reportFilter.grouping_expression;
        }
      } else if ( ! hasAnyGrouping) {
        groupingExpr = reportFilter.grouping_expression;
      }
      sql = sql.replace(`$${reportFilter.key}_grouping_expression$`, groupingExpr);

      if (INPUT_DATA[`${reportFilter.key}_filter_value`]) {
        let filterExpr = reportFilter.filter_expression;
        let filterValue = INPUT_DATA[`${reportFilter.key}_filter_value`];
        let filterExprReplaced;

        insertValues.push(filterValue);
        filterExprReplaced = filterExpr.replace('$FILTER_VALUE$', `$${insertValues.length}`);
        sql = sql.replace(`$${reportFilter.key}_filter_expression$`, filterExprReplaced);
      } else {
        sql = sql.replace(`$${reportFilter.key}_filter_expression$`, 'TRUE');
      }
    }

    return {sql, insertValues};
  }

  async ordersByUserReportDefinition(data) {
    const reportUIConfig =  {
        title: 'Orders Report by User',
        dataEndpoint: '/api/reports/report-orders-by-user',
        headerGroups: [
            [
                { key: 'user_email', label: 'User Email', rowspan: 2, format: 'text' },
                { key: 'user_id', label: 'User ID', rowspan: 2, align: 'right', format: 'text' },
                { key: 'orders_last_day_col', label: 'Last Day', colspan: 2 },
                { key: 'orders_last_week_col', label: 'Last Week', colspan: 2 },
                { key: 'orders_last_month_col', label: 'Last Month', colspan: 2 },
                { key: 'orders_last_year_col', label: 'Last Year', colspan: 2 }
            ],
            [
                { key: 'orders_last_day', label: 'Count', align: 'right', format: 'number' },
                { key: 'total_last_day', label: 'Total Order Amount', align: 'right', format: 'currency' },
                { key: 'orders_last_week', label: 'Count', align: 'right', format: 'number' },
                { key: 'total_last_week', label: 'Total Order Amount', align: 'right', format: 'currency' },
                { key: 'orders_last_month', label: 'Count', align: 'right', format: 'number' },
                { key: 'total_last_month', label: 'Total Order Amount', align: 'right', format: 'currency' },
                { key: 'orders_last_year', label: 'Count', align: 'right', format: 'number' },
                { key: 'total_last_year', label: 'Total Order Amount', align: 'right', format: 'currency' }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "user_email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: 'User Email',
            displayInUI: true,
        },
        {
            key: "user_id",
            grouping_expression: "U.id",
            filter_expression: "U.id = $FILTER_VALUE$",
            type: "number_single",
            label: "User ID",
            step: "1",
            min: 0,
            max: 100000000,
            displayInUI: true,
        },
        {
            key: "order_total_minimum",
            grouping_expression: "",
            filter_expression: "O.paid_amount >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "order_total_maximum",
            grouping_expression: "",
            filter_expression: "O.paid_amount <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: 'order_total',
            label: 'Order Amount',
            type: 'number',
            step: '0.01',
            min: 0,
            max: 100000000,
            displayInUI: true,
        },
    ];

    let sql = `
        SELECT
            $user_email_grouping_expression$ AS "user_email",
            $user_id_grouping_expression$ AS "user_id",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN 1 END) AS "orders_last_day",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN O.paid_amount END), 0) AS "total_last_day",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN 1 END) AS "orders_last_week",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN O.paid_amount END), 0) AS "total_last_week",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN 1 END) AS "orders_last_month",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN O.paid_amount END), 0) AS "total_last_month",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN 1 END) AS "orders_last_year",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN O.paid_amount END), 0) AS "total_last_year"
        FROM orders O
        JOIN users U ON U.id = O.user_id
        WHERE TRUE
            AND $user_email_filter_expression$
            AND $user_id_filter_expression$
            AND $order_total_minimum_filter_expression$
            AND $order_total_maximum_filter_expression$
        GROUP BY GROUPING SETS (
            (1, 2),
            ()
        )
        ORDER BY 1 ASC NULLS FIRST`;

    return { reportUIConfig, sql, reportFilters };
  }

  async logsReportDefinition(data) {
    const reportUIConfig =  {
        title: 'Logs Report',
        dataEndpoint: '/api/reports/report-logs',
        headerGroups: [
            [
                { key: 'id', label: 'ID', rowspan: 2, align: 'right', format: 'text' },
                { key: 'created_at', label: 'Created At', rowspan: 2, format: 'date_time' },
                { key: 'status_code', label: 'Status Code', rowspan: 2, format: 'text' },
                { key: 'log_level', label: 'Log Level', rowspan: 2, format: 'text' },
                { key: 'audit_type', label: 'Audit Type', rowspan: 2, format: 'text' },
                { key: 'short_description', label: 'Short Description', rowspan: 2, format: 'text' },
                { key: 'long_description', label: 'Long Description', rowspan: 2, format: 'text' },
                { key: 'debug_info', label: 'Debug Info', rowspan: 2, format: 'text' },
                { key: 'user_id', label: 'User ID', align: 'right', rowspan: 2, format: 'text' },
                { key: 'admin_user_id', label: 'Admin User ID', rowspan: 2, align: 'right', format: 'text' },
                { key: 'count', label: 'Count', align: 'right', rowspan: 2, format: 'number' }
            ]
        ]
    };

    const reportFilters = [
        {
            key: "id",
            grouping_expression: "L.id",
            filter_expression: "",
            type: "number",
        },
        {
            key: "created_at",
            grouping_expression: "L.created_at",
            filter_expression: "L.created_at = $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
            displayInUI: true,
        },
        {
            key: "admin_user_id",
            grouping_expression: "L.admin_user_id",
            filter_expression: "L.admin_user_id = $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "user_id",
            grouping_expression: "L.user_id",
            filter_expression: "L.user_id = $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "short_description",
            grouping_expression: "L.short_description",
            filter_expression: "STRPOS(LOWER(CAST( L.short_description AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
        },
        {
            key: "long_description",
            grouping_expression: "L.long_description",
            filter_expression: "STRPOS(LOWER(CAST( L.long_description AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
        },
        {
            key: "debug_info",
            grouping_expression: "L.debug_info",
            filter_expression: "STRPOS(LOWER(CAST( L.debug_info AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
        },
        {
            key: "status_code",
            grouping_expression: "L.status_code",
            filter_expression: "STRPOS(LOWER(CAST( L.status_code AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: 'Status Code',
            groupable: true,
            displayInUI: true,
        },
        {
            key: "log_level",
            grouping_expression: "L.log_level",
            filter_expression: "STRPOS(LOWER(CAST( L.log_level AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: 'Log Level',
            options: [
                { value: 'INFO', label: 'INFO' },
                { value: 'ERROR', label: 'ERROR' },
            ],
            groupable: true,
            displayInUI: true,
        },
        {
            key: "audit_type",
            grouping_expression: "L.audit_type",
            filter_expression: "L.audit_type = $FILTER_VALUE$",
            label: 'Audit Type',
            type: 'select',
            options:[
                { value: 'ASSERT', label: 'ASSERT' },
                { value: 'ASSERT_USER', label: 'ASSERT_USER' },
                { value: 'ASSERT_PEER', label: 'ASSERT_PEER' },
                { value: 'TEMPORARY', label: 'TEMPORARY' },
                { value: 'INFO', label: 'INFO' }
            ],
            groupable: true,
            displayInUI: true,
        },
        {
            key: "created_at_minimum",
            grouping_expression: "",
            filter_expression: "L.created_at >= $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "created_at_maximum",
            grouping_expression: "",
            filter_expression: "L.created_at <= $FILTER_VALUE$",
            type: "timestamp",
        },
    ];

    let sql = `
        SELECT
            $id_grouping_expression$ AS "id",
            $created_at_grouping_expression$ AS "created_at",
            $admin_user_id_grouping_expression$ AS "admin_user_id",
            $user_id_grouping_expression$ AS "user_id",
            $status_code_grouping_expression$ AS "status_code",
            $log_level_grouping_expression$ AS "log_level",
            $audit_type_grouping_expression$ AS "audit_type",
            $short_description_grouping_expression$ AS "short_description",
            $long_description_grouping_expression$ AS "long_description",
            $debug_info_grouping_expression$ AS "debug_info",
            COUNT(*) AS "count"
        FROM logs L
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $status_code_filter_expression$
            AND $log_level_filter_expression$
            AND $audit_type_filter_expression$
        GROUP BY GROUPING SETS (
            (1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
            ()
        )
        ORDER BY 1 DESC NULLS FIRST`;
    
    return { reportUIConfig, sql, reportFilters };
  }

  async ordersReportDefinition(data) {
    const reportUIConfig = {
        title: 'Orders Report',
        dataEndpoint: '/api/reports/report-orders',
        exportConfig: {
            csv: {
                endpoint: '/api/reports/report-orders/export/csv',
                label: 'Export to CSV'
            },
            excel: {
                endpoint: '/api/reports/report-orders/export/excel',
                label: 'Export to Excel'
            }
        },
        headerGroups: [
            [
                { key: 'created_at', label: 'Created At', format: 'date_time', rowspan: 2 },
                { key: 'order_id', label: 'Order ID', align: 'right', format: 'text', rowspan: 2 },
                { key: 'days_since_order', label: 'Days Since Order', align: 'right', format: 'number', rowspan: 2 },
                { key: 'user_email', label: 'User Email', format: 'text', rowspan: 2 },
                { key: 'status', label: 'Status', format: 'text', rowspan: 2 },
                { key: 'total_price', label: 'Total Price', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'discount_percentage', label: 'Discount %', align: 'right', format: 'percentage', rowspan: 2 },
                { key: 'discount_amount', label: 'Discount', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'vat_percentage', label: 'VAT %', align: 'right', format: 'percentage', rowspan: 2 },
                { key: 'vat_amount', label: 'VAT', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'total_price_with_vat', label: 'Total With VAT', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'voucher_code', label: 'Voucher Code', format: 'text', rowspan: 2 },
                { key: 'voucher_discount_amount', label: 'Voucher Discount', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'total_price_with_voucher', label: 'Total Price with voucher', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'total_price_with_voucher_without_vat', label: 'Final Price without VAT', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'total_price_with_voucher_vat_amount', label: 'Final Price VAT amount', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'paid_amount', label: 'Paid Amount', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'total_stock_price', label: 'Total Stock Price', align: 'right', format: 'currency', rowspan: 2 },
                { key: 'count', label: 'Count', align: 'right', format: 'number', rowspan: 2 }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "O.created_at",
            filter_expression: "O.created_at = $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
            displayInUI: true,
        },
        {
            key: "status",
            grouping_expression: "O.status",
            filter_expression: "O.status = $FILTER_VALUE$",
            type: 'select',
            label: 'Status',
            options: [
                { value: 'Pending', label: 'Pending' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Cancelled', label: 'Cancelled' }
            ],
            groupable: true,
            displayInUI: true,
        },
        {
            key: "user_email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "User Email",
            groupable: true,
            displayInUI: true,
        },
        {
            key: "order_id",
            grouping_expression: "O.id",
            filter_expression: "O.id = $FILTER_VALUE$",
            type: "text",
            label: "Order ID",
            displayInUI: true,
        },
        {
            key: "total_price",
            grouping_expression: "O.total_price",
            filter_expression: "",
            type: "number",
            label: "Total Price",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "days_since_order",
            grouping_expression: "EXTRACT(DAY FROM (NOW() - O.created_at))",
            filter_expression: "",
            type: "number",
            label: 'Days Since Order',
            type: 'number',
            step: '1',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        
        {
            key: "discount_percentage",
            grouping_expression: "O.discount_percentage",
            filter_expression: "",
            type: "number",
            label: "Discount %",
            type: "number",
            step: '0.01',
            min: 0,
            max: 100,
            displayInUI: true,
        },
        {
            key: "discount_percentage_minimum",
            grouping_expression: "",
            filter_expression: "O.discount_percentage >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "discount_percentage_maximum",
            grouping_expression: "",
            filter_expression: "O.discount_percentage <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "discount_amount",
            label: "Discount Amount",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "discount_amount_minimum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * O.discount_percentage / 100, 2) >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "discount_amount_maximum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * O.discount_percentage / 100, 2) <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "vat_percentage",
            grouping_expression: "O.vat_percentage",
            filter_expression: "",
            type: "number",
            label: "VAT %",
            step: '0.01',
            min: 0,
            max: 100,
            displayInUI: true,
        },
        {
            key: "vat_percentage_minimum",
            grouping_expression: "",
            filter_expression: "O.vat_percentage >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "vat_percentage_maximum",
            grouping_expression: "",
            filter_expression: "O.vat_percentage <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "vat_amount",
            grouping_expression: "",
            filter_expression: "",
            label: "VAT",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "vat_amount_minimum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2) >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "vat_amount_maximum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2) <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "total_price_with_vat",
            grouping_expression: "",
            filter_expression: "",
            label: "Total Price with VAT",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "total_price_with_vat_minimum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100), 2) >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "total_price_with_vat_maximum",
            grouping_expression: "",
            filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100), 2) <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "voucher_code",
            grouping_expression: "O.voucher_code",
            filter_expression: "STRPOS(LOWER(CAST( O.voucher_code AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Voucher Code",
            displayInUI: true,
        },
        {
            key: "voucher_discount_amount",
            grouping_expression: "O.voucher_discount_amount",
            filter_expression: "",
            type: "number",
            label: "Voucher Discount",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "voucher_discount_amount_minimum",
            grouping_expression: "",
            filter_expression: "O.voucher_discount_amount >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "voucher_discount_amount_maximum",
            grouping_expression: "",
            filter_expression: "O.voucher_discount_amount <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "paid_amount",
            grouping_expression: "",
            filter_expression: "",
            label: "Paid Amount",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
            displayInUI: true,
        },
        {
            key: "paid_amount_minimum",
            grouping_expression: "",
            filter_expression: "O.paid_amount >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "paid_amount_maximum",
            grouping_expression: "",
            filter_expression: "O.paid_amount <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "created_at_minimum",
            grouping_expression: "",
            filter_expression: "O.created_at >= $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "created_at_maximum",
            grouping_expression: "",
            filter_expression: "O.created_at <= $FILTER_VALUE$",
            type: "timestamp",
        },
       
        {
            key:"total_price_minimum",
            grouping_expression: "",
            filter_expression: "O.total_price >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key:"total_price_maximum",
            grouping_expression: "",
            filter_expression: "O.total_price <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "days_since_order_minimum",
            grouping_expression: "",
            filter_expression: "EXTRACT(DAY FROM (NOW() - O.created_at)) >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "days_since_order_maximum",
            grouping_expression: "",
            filter_expression: "EXTRACT(DAY FROM (NOW() - O.created_at)) <= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "total_stock_price",
            grouping_expression: "O.total_stock_price",
            filter_expression: "O.total_stock_price >= $FILTER_VALUE$",
            type: "number",
        }
    ];

    let sql = `
        SELECT * FROM (
            SELECT
                $created_at_grouping_expression$  AS "created_at",
                $order_id_grouping_expression$  AS "order_id",
                $days_since_order_grouping_expression$  AS "days_since_order",
                $user_email_grouping_expression$  AS "user_email",
                $status_grouping_expression$  AS "status",
                $discount_percentage_grouping_expression$ AS "discount_percentage",
                $vat_percentage_grouping_expression$  AS "vat_percentage",
                $voucher_code_grouping_expression$ AS "voucher_code",
                $voucher_discount_amount_grouping_expression$ AS "voucher_discount_amount",
                SUM(ROUND(O.total_price * O.discount_percentage / 100, 2)) AS "discount_amount",
                SUM(ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2))  AS "vat_amount",
                SUM(ROUND(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100), 2))  AS "total_price_with_vat",
                SUM(ROUND(GREATEST(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100) - O.voucher_discount_amount, 0), 2)) AS "total_price_with_voucher",
                SUM(ROUND(GREATEST(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100) - O.voucher_discount_amount, 0) / (1 + O.vat_percentage / 100), 2)) AS total_price_with_voucher_without_vat,
                SUM(ROUND(GREATEST(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100) - O.voucher_discount_amount, 0) - 
                    (GREATEST(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100) - O.voucher_discount_amount, 0) / (1 + O.vat_percentage / 100)), 2)) AS total_price_with_voucher_vat_amount,
                SUM(paid_amount) AS "paid_amount",
                SUM(O.total_price) AS "total_price",
                SUM(O.total_stock_price) AS "total_stock_price",
                COUNT(*) as count
            FROM orders O
            JOIN users U ON U.id = O.user_id
            WHERE TRUE
                AND $created_at_minimum_filter_expression$
                AND $created_at_maximum_filter_expression$
                AND $order_id_filter_expression$
                AND $user_email_filter_expression$
                AND $status_filter_expression$
                AND $discount_percentage_minimum_filter_expression$
                AND $discount_percentage_maximum_filter_expression$
                AND $discount_amount_minimum_filter_expression$
                AND $discount_amount_maximum_filter_expression$
                AND $vat_percentage_minimum_filter_expression$
                AND $vat_percentage_maximum_filter_expression$
                AND $vat_amount_minimum_filter_expression$
                AND $vat_amount_maximum_filter_expression$
                AND $total_price_with_vat_minimum_filter_expression$
                AND $total_price_with_vat_maximum_filter_expression$
                AND $voucher_code_filter_expression$
                AND $voucher_discount_amount_minimum_filter_expression$
                AND $voucher_discount_amount_maximum_filter_expression$
                AND $paid_amount_minimum_filter_expression$
                AND $paid_amount_maximum_filter_expression$
                AND $total_price_minimum_filter_expression$
                AND $total_price_maximum_filter_expression$
                AND $days_since_order_minimum_filter_expression$
                AND $days_since_order_maximum_filter_expression$
            GROUP BY GROUPING SETS (
                (1, 2, 3, 4, 5, 6, 7, 8, 9),
                ()
            )
        ) subquery
        ORDER BY 1 DESC NULLS FIRST`;

    return { reportUIConfig, sql, reportFilters };
  }

  async usersReportDefinition(data) {
    const reportUIConfig = {
        title: 'Users Report',
        dataEndpoint: '/api/reports/report-users',
        headerGroups: [
            [
                { key: 'created_at', label: 'Created At', rowspan: 2, format: 'date_time' },
                { key: 'first_name', label: 'First Name', rowspan: 2, format: 'text' },
                { key: 'last_name', label: 'Last Name', rowspan: 2, format: 'text' },
                { key: 'email', label: 'Email', rowspan: 2, format: 'text' },
                { key: 'phone_code', label: 'Phone Code', rowspan: 2, format: 'text' },
                { key: 'phone', label: 'Phone', rowspan: 2, format: 'text' },
                { key: 'country_name', label: 'Country', rowspan: 2, format: 'text' },
                { key: 'gender', label: 'Gender', rowspan: 2, format: 'text' },
                { key: 'birth_date', label: 'Birth Date', rowspan: 2, format: 'date' },
                { key: 'is_email_verified', label: 'Is Email Verified', rowspan: 2, format: 'boolean' },
                { key: 'days_since_creation', label: 'Days Since Creation', rowspan: 2, align: 'right', format: 'number' },
                { key: 'count', label: 'Count', rowspan: 2, align: 'right', format: 'number' }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "U.created_at",
            filter_expression: "U.created_at = $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
            displayInUI: true,
        },
        {
            key: "country_name",
            grouping_expression: "cc.country_name",
            filter_expression: "cc.id = $FILTER_VALUE$",
            type: "select",
            label: "Country",
            groupable: true,
            fetchFrom: "/crud/iso-country-codes",
            displayKey: 'country_name',
            valueKey: 'id',
            displayInUI: true,
        },
        {
            key: "phone_code",
            grouping_expression: "icc.phone_code",
            filter_expression: "icc.id = $FILTER_VALUE$",
            type: "select",
            label: "Phone Code",
            groupable: true,
            fetchFrom: "/crud/iso-country-codes",
            displayKey: 'phone_code',
            valueKey: 'id',
            displayInUI: true,
        },
        {
            key: "is_email_verified",
            grouping_expression: "U.is_email_verified",
            filter_expression: "U.is_email_verified = $FILTER_VALUE$",
            type: "select",
            label: "Is Email Verified",
            groupable: true,
            options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' }
            ],
            displayInUI: true,
        },
        {
            key: "days_since_creation",
            grouping_expression: "DATE_PART('day', CURRENT_DATE - U.created_at)", 
            filter_expression: "",
            type: "number",
            label: "Days Since Creation",
            step: '1',
            min: 0,
            max: 100000000,
            displayInUI: true,
        },
        {
            key: "first_name",
            grouping_expression: "U.first_name",
            filter_expression: "STRPOS(LOWER(CAST( U.first_name AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "First Name",
            displayInUI: true,
        },
        {
            key: "last_name",
            grouping_expression: "U.last_name",
            filter_expression: "STRPOS(LOWER(CAST( U.last_name AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Last Name",
            displayInUI: true,
        },
        {
            key: "email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Email",
            displayInUI: true,
        },
        {
            key: "phone",
            grouping_expression: "U.phone",
            filter_expression: "",
            type: "text",
        },
        {
            key: "gender",
            grouping_expression: "genders.type",
            filter_expression: "",
            type: "text",
        },
        {
            key: "birth_date",
            grouping_expression: "U.birth_date",
            filter_expression: "",
            type: "timestamp",
        },
        {
            key: "created_at_minimum",
            grouping_expression: "",
            filter_expression: "U.created_at >= $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "created_at_maximum",
            grouping_expression: "",
            filter_expression: "U.created_at <= $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "days_since_creation_minimum",
            grouping_expression: "",
            filter_expression: "DATE_PART('day', CURRENT_DATE - U.created_at) >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "days_since_creation_maximum",
            grouping_expression: "",
            filter_expression: "DATE_PART('day', CURRENT_DATE - U.created_at) <= $FILTER_VALUE$",
            type: "number",
        },
    ];

    let sql = `
        SELECT
            $first_name_grouping_expression$ AS "first_name",
            $last_name_grouping_expression$  AS "last_name",
            $email_grouping_expression$  AS "email",
            $phone_grouping_expression$  AS "phone",
            $phone_code_grouping_expression$ AS "phone_code",
            $country_name_grouping_expression$ AS "country_name",
            $gender_grouping_expression$ AS "gender",
            $birth_date_grouping_expression$ AS "birth_date",
            $is_email_verified_grouping_expression$ AS "is_email_verified",
            $created_at_grouping_expression$ AS "created_at",
            $days_since_creation_grouping_expression$ AS "days_since_creation",
            COUNT(*) AS "count"
        FROM users U
        LEFT JOIN iso_country_codes icc ON U.iso_country_code_id = icc.id
        LEFT JOIN iso_country_codes cc ON U.country_id = cc.id
        LEFT JOIN genders ON U.gender_id = genders.id
        WHERE U.is_active = TRUE
            AND $first_name_filter_expression$
            AND $last_name_filter_expression$
            AND $email_filter_expression$
            AND $country_name_filter_expression$
            AND $phone_code_filter_expression$
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $days_since_creation_minimum_filter_expression$
            AND $days_since_creation_maximum_filter_expression$
            AND $is_email_verified_filter_expression$
        GROUP BY GROUPING SETS (
            (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
            ()
        )
        ORDER BY 1 NULLS FIRST`;
    
    return { reportUIConfig, sql, reportFilters };
  }

  async storeTrendsReportDefinition(data) {
    const reportUIConfig = {};

    const reportFilters = [
        {
            key: "start_date",
            grouping_expression: "",
            filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date)",
            type: "timestamp",
            label: "Start Date",
            displayInUI: true,
          },
          {
            key: "end_date", 
            grouping_expression: "",
            filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date + INTERVAL '1 day')",
            type: "timestamp",
            label: "End Date",
            displayInUI: true,
        },
    ];

    let sql = `
        WITH date_filter AS (
        SELECT
            $start_date_filter_expression$ AS start_date,
            $end_date_filter_expression$ AS end_date
        ),
        registered_users AS (
            SELECT
                COUNT(*) AS registered_users
            FROM users u 
            WHERE u.created_at BETWEEN (SELECT start_date FROM date_filter) AND (SELECT end_date FROM date_filter)
        ),
        prev_week_registered_users AS (
            SELECT
                COUNT(*) AS registered_users
            FROM users u 
            WHERE u.created_at BETWEEN (SELECT (start_date - INTERVAL '7 days')::date FROM date_filter) AND (SELECT (end_date - INTERVAL '7 days')::date FROM date_filter)
        ),
        order_metrics AS (
            SELECT 
                COUNT(DISTINCT user_id) AS active_users,
                COALESCE(AVG(paid_amount), 0) AS avg_order_price,
                COALESCE(SUM(paid_amount) / COUNT(DISTINCT(user_id)), 0) AS avg_amount_spent_by_user,
                COALESCE(SUM(paid_amount - total_stock_price), 0) AS net_revenue,
                COALESCE(SUM(paid_amount - total_stock_price) / COUNT(DISTINCT user_id), 0) as avg_net_revenue_by_user
            FROM orders
            WHERE status = 'Paid' AND created_at BETWEEN (SELECT start_date FROM date_filter) AND (SELECT end_date FROM date_filter)
        ),
        prev_week_order_metrics AS (
            SELECT 
                COUNT(DISTINCT user_id) AS active_users,
                COALESCE(AVG(paid_amount), 0) AS avg_order_price,
                COALESCE(SUM(paid_amount) / COUNT(DISTINCT(user_id)), 0) AS avg_amount_spent_by_user,
                COALESCE(SUM(paid_amount - total_stock_price), 0) AS net_revenue,
                COALESCE(SUM(paid_amount - total_stock_price) / COUNT(DISTINCT user_id), 0) as avg_net_revenue_by_user
            FROM orders
            WHERE status = 'Paid' AND created_at BETWEEN (SELECT (start_date - INTERVAL '7 days')::date FROM date_filter) AND (SELECT (end_date - INTERVAL '7 days')::date FROM date_filter)
        ),
        order_data AS (
            SELECT 
                date_trunc('month', created_at) AS month_start,
                COUNT(DISTINCT user_id) AS active_users,
                AVG(paid_amount) AS avg_order_price,
                SUM(paid_amount) AS total_revenue,
                SUM(paid_amount - total_stock_price) AS net_revenue,
                COUNT(DISTINCT user_id) AS distinct_users
            FROM orders
            WHERE status = 'Paid'
            GROUP BY date_trunc('month', created_at)
        ),
        user_data AS (
            SELECT 
                date_trunc('month', created_at) AS month_start,
                COUNT(id) AS registered_users
            FROM users
            GROUP BY date_trunc('month', created_at)
        ),
        yearly_trends AS (
            SELECT
                ms.month_start,
                COALESCE(o.active_users, 0) AS active_users,
                ROUND(COALESCE(o.avg_order_price, 0), 2) AS avg_order_price,
                ROUND(COALESCE(o.total_revenue / NULLIF(o.distinct_users, 0), 0), 2) AS avg_amount_spent_by_user,
                ROUND(COALESCE(o.net_revenue, 0), 2) AS net_revenue,
                ROUND(COALESCE(o.net_revenue / NULLIF(o.distinct_users, 0), 0), 2) AS avg_net_revenue_by_user,
                COALESCE(u.registered_users, 0) AS registered_users
            FROM (
                SELECT generate_series(
                    date_trunc('month', (SELECT end_date FROM date_filter) - INTERVAL '1 year'),
                    date_trunc('month', (SELECT end_date FROM date_filter)),
                    '1 month'
                ) AS month_start
            ) ms
            LEFT JOIN order_data o ON o.month_start = ms.month_start
            LEFT JOIN user_data u ON u.month_start = ms.month_start
        )
        SELECT 
            jsonb_build_array(
                jsonb_build_object(
                    'name', 'Registered Users',
                    'current', registered_users.registered_users,
                    'previous', prev_week_registered_users.registered_users,
                    'change', ROUND(((registered_users.registered_users - prev_week_registered_users.registered_users)::float / NULLIF(prev_week_registered_users.registered_users, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(registered_users) FROM yearly_trends)
                ),
                jsonb_build_object(
                    'name', 'Active Users',
                    'current', order_metrics.active_users,
                    'previous',  prev_week_order_metrics.active_users,
                    'change', ROUND(((order_metrics.active_users - prev_week_order_metrics.active_users)::float / NULLIF(prev_week_order_metrics.active_users, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(active_users) FROM yearly_trends)
                ),
                jsonb_build_object(
                    'name', 'Average Order Price',
                    'current', ROUND(order_metrics.avg_order_price::numeric, 2),
                    'previous', ROUND(prev_week_order_metrics.avg_order_price::numeric, 2),
                    'change', ROUND(((order_metrics.avg_order_price - prev_week_order_metrics.avg_order_price)::float / NULLIF(prev_week_order_metrics.avg_order_price, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(avg_order_price) FROM yearly_trends)
                ),
                jsonb_build_object(
                    'name', 'Average Amount Spent by User',
                    'current', ROUND(order_metrics.avg_amount_spent_by_user::numeric, 2),
                    'previous', ROUND(prev_week_order_metrics.avg_amount_spent_by_user::numeric, 2),
                    'change', ROUND(((order_metrics.avg_amount_spent_by_user - prev_week_order_metrics.avg_amount_spent_by_user)::float / NULLIF(prev_week_order_metrics.avg_amount_spent_by_user, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(avg_amount_spent_by_user) FROM yearly_trends)
                ),
                jsonb_build_object(
                    'name', 'Net Revenue',
                    'current', ROUND(order_metrics.net_revenue::numeric, 2),
                    'previous', ROUND(prev_week_order_metrics.net_revenue::numeric, 2),
                    'change', ROUND(((order_metrics.net_revenue - prev_week_order_metrics.net_revenue)::float / NULLIF(prev_week_order_metrics.net_revenue, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(net_revenue) FROM yearly_trends)
                ),
                jsonb_build_object(
                    'name', 'Net Revenue by User',
                    'current', ROUND(order_metrics.avg_net_revenue_by_user::numeric, 2),
                    'previous', ROUND(prev_week_order_metrics.avg_net_revenue_by_user::numeric, 2),
                    'change', ROUND(((order_metrics.avg_net_revenue_by_user - prev_week_order_metrics.avg_net_revenue_by_user)::float / NULLIF(prev_week_order_metrics.avg_net_revenue_by_user, 0) * 100)::numeric, 2),
                    'trend', (SELECT jsonb_agg(avg_net_revenue_by_user) FROM yearly_trends)
                )
            ) AS dashboard_data
        FROM registered_users
        CROSS JOIN prev_week_registered_users
        CROSS JOIN order_metrics
        CROSS JOIN prev_week_order_metrics;
    `;
  
    return { reportUIConfig, sql, reportFilters };
  }

  async campaignTrendsReportDefinition(data) {
    const reportUIConfig = {};
  
    const reportFilters = [
      {
        key: "start_date",
        grouping_expression: "",
        filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date)",
        type: "timestamp",
        label: "Start Date",
        displayInUI: true,
      },
      {
        key: "end_date", 
        grouping_expression: "",
        filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date + INTERVAL '1 day')",
        type: "timestamp",
        label: "End Date",
        displayInUI: true,
      },
    ];
  
    let sql = `
        WITH date_filter AS (
        SELECT
            $start_date_filter_expression$ AS start_date,
            $end_date_filter_expression$ AS end_date
        ),
        campaign_metrics AS (
        SELECT 
            COUNT(DISTINCT o.user_id) AS users_with_campaign_activity,
            COUNT(DISTINCT CASE WHEN o.discount_percentage > 0 THEN o.id END) AS orders_with_promotion,
            COUNT(DISTINCT CASE WHEN o.voucher_code IS NOT NULL THEN o.id END) AS orders_with_voucher,
            SUM(o.paid_amount) AS total_paid_amount,
            SUM(o.paid_amount - o.total_stock_price) AS net_amount
        FROM orders o
        WHERE (o.discount_percentage > 0 OR o.voucher_code IS NOT NULL) 
            AND o.created_at BETWEEN (SELECT start_date FROM date_filter) 
            AND (SELECT end_date FROM date_filter)
        ),
        prev_week_campaign_metrics AS (
        SELECT 
            COUNT(DISTINCT o.user_id) AS users_with_campaign_activity,
            COUNT(DISTINCT CASE WHEN o.discount_percentage > 0 THEN o.id END) AS orders_with_promotion,
            COUNT(DISTINCT CASE WHEN o.voucher_code IS NOT NULL THEN o.id END) AS orders_with_voucher,
            SUM(o.paid_amount) AS total_paid_amount,
            SUM(o.paid_amount - o.total_stock_price) AS net_amount
        FROM orders o
        WHERE (o.discount_percentage > 0 OR o.voucher_code IS NOT NULL)  
            AND o.created_at BETWEEN (SELECT (start_date - INTERVAL '7 days')::date FROM date_filter) 
            AND (SELECT (end_date - INTERVAL '7 days')::date FROM date_filter)
        )
        SELECT jsonb_build_array(
            jsonb_build_object(
                'name', 'Users with Campaign Activity',
                'current', cm.users_with_campaign_activity,
                'previous', pw.users_with_campaign_activity,
                'change', ROUND(((cm.users_with_campaign_activity - pw.users_with_campaign_activity)::float 
                        / NULLIF(pw.users_with_campaign_activity, 0) * 100)::numeric, 2)
            ),
            jsonb_build_object(
                'name', 'Promotions Used',
                'current', cm.orders_with_promotion,
                'previous', pw.orders_with_promotion,
                'change', ROUND(((cm.orders_with_promotion - pw.orders_with_promotion)::float 
                        / NULLIF(pw.orders_with_promotion, 0) * 100)::numeric, 2)
            ),
            jsonb_build_object(
                'name', 'Vouchers Used',
                'current', cm.orders_with_voucher,
                'previous', pw.orders_with_voucher, 
                'change', ROUND(((cm.orders_with_voucher - pw.orders_with_voucher)::float
                        / NULLIF(pw.orders_with_voucher, 0) * 100)::numeric, 2)
            ),
            jsonb_build_object(
                'name', 'Gross Revenue',
                'current', ROUND(cm.total_paid_amount::numeric, 2),
                'previous', ROUND(pw.total_paid_amount::numeric, 2),
                'change', ROUND(((cm.total_paid_amount - pw.total_paid_amount)::float
                        / NULLIF(ABS(pw.total_paid_amount), 0) * 100)::numeric, 2)
            ),
            jsonb_build_object(
                'name', 'Net Revenue',
                'current', ROUND(cm.net_amount::numeric, 2),
                'previous', ROUND(pw.net_amount::numeric, 2),
                'change', ROUND(((cm.net_amount - pw.net_amount)::float
                        / NULLIF(ABS(pw.net_amount), 0) * 100)::numeric, 2)
            )
        ) AS campaign_data
        FROM campaign_metrics cm
        CROSS JOIN prev_week_campaign_metrics pw;
    `;  
  
    return { reportUIConfig, sql, reportFilters };
  }

  formatReportMetadata(reportFilters, INPUT_DATA) {
    const filters = {};
    const groupings = {};
  
    // Helper for formatting date ranges
    const formatDateRange = (min, max) => {
      if (min && max) return `${min} to ${max}`;
      if (min) return `From ${min}`;
      if (max) return `To ${max}`;
    };
  
    // Process each filter
    reportFilters.forEach(filter => {
      const baseKey = filter.key;
      
      // Handle date ranges
      if (baseKey.endsWith('_minimum')) {
        const baseFieldName = baseKey.replace('_minimum', '');
        const minValue = INPUT_DATA[`${baseFieldName}_minimum_filter_value`];
        const maxValue = INPUT_DATA[`${baseFieldName}_maximum_filter_value`];
        
        if (minValue || maxValue) {
          const label = baseFieldName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          filters[label] = formatDateRange(minValue, maxValue);
        }
      }
      // Handle regular filters
      else if (!baseKey.endsWith('_maximum')) {
        const filterValue = INPUT_DATA[`${baseKey}_filter_value`];
        const groupValue = INPUT_DATA[`${baseKey}_grouping_select_value`];
        
        if (filterValue) {
          const label = baseKey.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          filters[label] = filterValue;
        }
        
        if (groupValue && groupValue !== 'all') {
            const label = baseKey.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          groupings[label] = groupValue.charAt(0).toUpperCase() + groupValue.slice(1);
        }
      }
    });
  
    return { filters, groupings };
  }
}

module.exports = ReportService;
