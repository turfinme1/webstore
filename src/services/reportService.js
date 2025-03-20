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
        "report-notifications": this.notificationsReportDefinition.bind(this),
        "report-notifications-status": this.notificationsStatusReportDefinition.bind(this),
        "report-campaigns": this.campaignsReportDefinition.bind(this),
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

  async getAllReports(data) {
    return Object.keys(this.reports);
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
        sql = sql.replaceAll(`$${reportFilter.key}_filter_expression$`, filterExprReplaced);
      } else {
        sql = sql.replaceAll(`$${reportFilter.key}_filter_expression$`, 'TRUE');
      }

      if(INPUT_DATA[`${reportFilter.key}_minimum_filter_value`]) {
        let filterExpr = reportFilter.minimum_filter_expression;
        let filterValue = INPUT_DATA[`${reportFilter.key}_minimum_filter_value`];
        let filterExprReplaced;

        insertValues.push(filterValue);
        filterExprReplaced = filterExpr.replace('$FILTER_VALUE$', `$${insertValues.length}`);
        sql = sql.replaceAll(`$${reportFilter.key}_minimum_filter_expression$`, filterExprReplaced);
      } else {
        sql = sql.replaceAll(`$${reportFilter.key}_minimum_filter_expression$`, 'TRUE');
      }

      if(INPUT_DATA[`${reportFilter.key}_maximum_filter_value`]) {
        let filterExpr = reportFilter.maximum_filter_expression;
        let filterValue = INPUT_DATA[`${reportFilter.key}_maximum_filter_value`];
        let filterExprReplaced;

        insertValues.push(filterValue);
        filterExprReplaced = filterExpr.replace('$FILTER_VALUE$', `$${insertValues.length}`);
        sql = sql.replaceAll(`$${reportFilter.key}_maximum_filter_expression$`, filterExprReplaced);
      }
      else {
        sql = sql.replaceAll(`$${reportFilter.key}_maximum_filter_expression$`, 'TRUE');
      }
    }

    if (INPUT_DATA.sortCriteria && Array.isArray(INPUT_DATA.sortCriteria)) {
        const validDirections = ['ASC', 'DESC'];
        const orderClauses = INPUT_DATA.sortCriteria
            .filter(criteria => {
                const filterExists = reportFilters.some(filter => filter.key === criteria.key);
                const isValidDirection = validDirections.includes(criteria.direction);
                return filterExists && isValidDirection;
            })
            .map(criteria => {
                const filter = reportFilters.find(f => f.key === criteria.key);
                return `${filter.key} ${criteria.direction} `;
            });

        if (orderClauses.length > 0) {
            const orderByClause = ` ${orderClauses.join(', ')}`;
            sql = sql.replace('1 DESC', `${orderByClause} `);
        }
    }

    return { sql, insertValues };
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
                { key: 'orders_last_day', label: 'Count', format: 'number' },
                { key: 'total_last_day', label: 'Total Order Amount', format: 'currency' },
                { key: 'orders_last_week', label: 'Count', format: 'number' },
                { key: 'total_last_week', label: 'Total Order Amount', format: 'currency' },
                { key: 'orders_last_month', label: 'Count', format: 'number' },
                { key: 'total_last_month', label: 'Total Order Amount', format: 'currency' },
                { key: 'orders_last_year', label: 'Count', format: 'number' },
                { key: 'total_last_year', label: 'Total Order Amount', format: 'currency' }
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
        },
        {
            key: 'order_total',
            label: 'Order Amount',
            minimum_filter_expression: "O.paid_amount >= $FILTER_VALUE$",
            maximum_filter_expression: "O.paid_amount <= $FILTER_VALUE$",
            type: 'number',
            step: '0.01',
            min: 0,
            max: 100000000,
        },
    ];

    let sql = `
        SELECT
            NULL AS "user_email",
            NULL AS "user_id",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN 1 END) AS "orders_last_day",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN O.paid_amount END), 0) AS "total_last_day",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN 1 END) AS "orders_last_week",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN O.paid_amount END), 0) AS "total_last_week",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN 1 END) AS "orders_last_month",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN O.paid_amount END), 0) AS "total_last_month",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN 1 END) AS "orders_last_year",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN O.paid_amount END), 0) AS "total_last_year",
            0 AS "sort_order" 
        FROM orders O
        JOIN users U ON U.id = O.user_id
        WHERE TRUE
            AND $user_email_filter_expression$
            AND $user_id_filter_expression$
            AND $order_total_minimum_filter_expression$
            AND $order_total_maximum_filter_expression$

        UNION ALL

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
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN O.paid_amount END), 0) AS "total_last_year",
            1 AS "sort_order" 
        FROM orders O
        JOIN users U ON U.id = O.user_id
        WHERE TRUE
            AND $user_email_filter_expression$
            AND $user_id_filter_expression$
            AND $order_total_minimum_filter_expression$
            AND $order_total_maximum_filter_expression$
        GROUP BY 1, 2
        ORDER BY sort_order ASC, 1 DESC`;

    return { reportUIConfig, sql, reportFilters };
  }

  async logsReportDefinition(data) {
    const reportUIConfig =  {
        title: 'Logs Report',
        dataEndpoint: '/api/reports/report-logs',
        headerGroups: [
            [
                { key: 'created_at', label: 'Created At', format: 'date_time' },
                { key: 'id', label: 'ID', align: 'right', format: 'text' },
                { key: 'status_code', label: 'Status Code', format: 'text' },
                { key: 'log_level', label: 'Log Level', format: 'text' },
                { key: 'audit_type', label: 'Audit Type', format: 'text' },
                { key: 'short_description', label: 'Short Description', format: 'text' },
                { key: 'long_description', label: 'Long Description', format: 'text' },
                { key: 'debug_info', label: 'Debug Info', format: 'text' },
                { key: 'user_id', label: 'User ID', align: 'right', format: 'text' },
                { key: 'admin_user_id', label: 'Admin User ID', align: 'right', format: 'text' },
                { key: 'count', label: 'Count', format: 'number' }
            ]
        ]
    };

    const reportFilters = [
        {
            key: "id",
            grouping_expression: "L.id",
            type: "number",
            hideInUI: true,
        },
        {
            key: "created_at",
            grouping_expression: "L.created_at",
            filter_expression: "L.created_at = $FILTER_VALUE$",
            minimum_filter_expression: "L.created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "L.created_at <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
        },
        {
            key: "admin_user_id",
            grouping_expression: "L.admin_user_id",
            filter_expression: "L.admin_user_id = $FILTER_VALUE$",
            label: 'Admin User ID',
            type: "number_single",
        },
        {
            key: "user_id",
            grouping_expression: "L.user_id",
            filter_expression: "L.user_id = $FILTER_VALUE$",
            label: 'User ID',
            type: "number_single",
        },
        {
            key: "short_description",
            grouping_expression: "L.short_description",
            filter_expression: "STRPOS(LOWER(CAST( L.short_description AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            hideInUI: true,
        },
        {
            key: "long_description",
            grouping_expression: "L.long_description",
            filter_expression: "STRPOS(LOWER(CAST( L.long_description AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            hideInUI: true,
        },
        {
            key: "debug_info",
            grouping_expression: "L.debug_info",
            filter_expression: "STRPOS(LOWER(CAST( L.debug_info AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            hideInUI: true,
        },
        {
            key: "status_code",
            grouping_expression: "L.status_code",
            filter_expression: "STRPOS(LOWER(CAST( L.status_code AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: 'Status Code',
            groupable: true,
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
        },
        {
            key: "count",
            type: "number",
            hideInUI: true,
        }
    ];

    let sql = `
        SELECT
            NULL AS "created_at",
            NULL AS "id",
            NULL AS "admin_user_id",
            NULL AS "user_id",
            NULL AS "status_code",
            NULL AS "log_level",
            NULL AS "audit_type",
            NULL AS "short_description",
            NULL AS "long_description",
            NULL AS "debug_info",
            COUNT(*) AS "count",
            0 AS "sort_order" 
        FROM logs L
        WHERE TRUE
            AND $user_id_filter_expression$
            AND $admin_user_id_filter_expression$
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $status_code_filter_expression$
            AND $log_level_filter_expression$
            AND $audit_type_filter_expression$
        
        UNION ALL
        
        SELECT
            $created_at_grouping_expression$ AS "created_at",
            $id_grouping_expression$ AS "id",
            $admin_user_id_grouping_expression$ AS "admin_user_id",
            $user_id_grouping_expression$ AS "user_id",
            $status_code_grouping_expression$ AS "status_code",
            $log_level_grouping_expression$ AS "log_level",
            $audit_type_grouping_expression$ AS "audit_type",
            $short_description_grouping_expression$ AS "short_description",
            $long_description_grouping_expression$ AS "long_description",
            $debug_info_grouping_expression$ AS "debug_info",
            COUNT(*) AS "count",
            1 AS "sort_order" 
        FROM logs L
        WHERE TRUE
            AND $user_id_filter_expression$
            AND $admin_user_id_filter_expression$
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $status_code_filter_expression$
            AND $log_level_filter_expression$
            AND $audit_type_filter_expression$
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
        ORDER BY sort_order ASC, 1 DESC`;
    
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
                { key: 'created_at', label: 'Created At', format: 'date_time', },
                { key: 'order_id', label: 'Order ID', align: 'right', format: 'text', },
                { key: 'days_since_order', label: 'Days Since Order', align: 'right', format: 'number', },
                { key: 'user_email', label: 'User Email', format: 'text', },
                { key: 'status', label: 'Status', format: 'text', },
                { key: 'total_price', label: 'Total Price', format: 'currency', },
                { key: 'discount_percentage', label: 'Discount %', format: 'percentage', },
                { key: 'discount_amount', label: 'Discount', format: 'currency', },
                { key: 'vat_percentage', label: 'VAT %', format: 'percentage', },
                { key: 'vat_amount', label: 'VAT', format: 'currency', },
                { key: 'total_price_with_vat', label: 'Total With VAT', format: 'currency', },
                { key: 'campaign_name', label: 'Campaign Name', format: 'text', },
                { key: 'voucher_code', label: 'Voucher Code', format: 'text', },
                { key: 'voucher_discount_amount', label: 'Voucher Discount', format: 'currency', },
                { key: 'total_price_with_voucher', label: 'Total Price with voucher', format: 'currency', },
                { key: 'total_price_with_voucher_without_vat', label: 'Final Price without VAT', format: 'currency', },
                { key: 'total_price_with_voucher_vat_amount', label: 'Final Price VAT amount', format: 'currency', },
                { key: 'paid_amount', label: 'Paid Amount', format: 'currency', },
                { key: 'total_stock_price', label: 'Total Stock Price', format: 'currency', },
                { key: 'count', label: 'Count', format: 'number', }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "O.created_at",
            filter_expression: "O.created_at = $FILTER_VALUE$",
            minimum_filter_expression: "O.created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "O.created_at <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
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
        },
        {
            key: "user_email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "User Email",
            groupable: true,
        },
        {
            key: "order_id",
            grouping_expression: "O.id",
            filter_expression: "O.id = $FILTER_VALUE$",
            type: "text",
            label: "Order ID",
        },
        {
            key: "total_price",
            grouping_expression: "O.total_price",
            minimum_filter_expression: "O.total_price >= $FILTER_VALUE$",
            maximum_filter_expression: "O.total_price <= $FILTER_VALUE$",
            type: "number",
            label: "Total Price",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "days_since_order",
            grouping_expression: "EXTRACT(DAY FROM (NOW() - O.created_at))",
            minimum_filter_expression: "EXTRACT(DAY FROM (NOW() - O.created_at)) >= $FILTER_VALUE$",
            maximum_filter_expression: "EXTRACT(DAY FROM (NOW() - O.created_at)) <= $FILTER_VALUE$",
            type: "number",
            label: 'Days Since Order',
            type: 'number',
            step: '1',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "discount_percentage",
            grouping_expression: "O.discount_percentage",
            filter_expression: "",
            minimum_filter_expression: "O.discount_percentage >= $FILTER_VALUE$",
            maximum_filter_expression: "O.discount_percentage <= $FILTER_VALUE$",
            type: "number",
            label: "Discount %",
            type: "number",
            step: '0.01',
            min: 0,
            max: 100,
        },
        {
            key: "discount_amount",
            label: "Discount Amount",
            minimum_filter_expression: "ROUND(O.total_price * O.discount_percentage / 100, 2) >= $FILTER_VALUE$",
            maximum_filter_expression: "ROUND(O.total_price * O.discount_percentage / 100, 2) <= $FILTER_VALUE$",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        
        {
            key: "vat_percentage",
            grouping_expression: "O.vat_percentage",
            filter_expression: "",
            minimum_filter_expression: "O.vat_percentage >= $FILTER_VALUE$",
            maximum_filter_expression: "O.vat_percentage <= $FILTER_VALUE$",
            type: "number",
            label: "VAT %",
            step: '0.01',
            min: 0,
            max: 100,
        },
        {
            key: "vat_amount",
            grouping_expression: "",
            minimum_filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2) >= $FILTER_VALUE$",
            maximum_filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2) <= $FILTER_VALUE$",
            label: "VAT",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "total_price_with_vat",
            grouping_expression: "",
            minimum_filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100), 2) >= $FILTER_VALUE$",
            maximum_filter_expression: "ROUND(O.total_price * (1 - O.discount_percentage / 100) * (1 + O.vat_percentage / 100), 2) <= $FILTER_VALUE$",
            label: "Total Price with VAT",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "campaign_name",
            grouping_expression: "C.name",
            filter_expression: "C.id = $FILTER_VALUE$",
            type: "select",
            label: "Campaign Name",
            fetchFrom: "/crud/campaigns",
            displayKey: 'name',
            valueKey: 'id',
        },
        {
            key: "voucher_code",
            grouping_expression: "O.voucher_code",
            filter_expression: "STRPOS(LOWER(CAST( O.voucher_code AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Voucher Code",
        },
        {
            key: "voucher_discount_amount",
            grouping_expression: "O.voucher_discount_amount",
            minimum_filter_expression: "O.voucher_discount_amount >= $FILTER_VALUE$",
            maximum_filter_expression: "O.voucher_discount_amount <= $FILTER_VALUE$",
            type: "number",
            label: "Voucher Discount",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "paid_amount",
            grouping_expression: "",
            minimum_filter_expression: "O.paid_amount >= $FILTER_VALUE$",
            maximum_filter_expression: "O.paid_amount <= $FILTER_VALUE$",
            label: "Paid Amount",
            type: "number",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "total_stock_price",
            grouping_expression: "O.total_stock_price",
            type: "number",
            hideInUI: true,
        },
        {
            key: "count",
            type: "number",
            hideInUI: true,
        }, 
    ];

    let sql = `
        SELECT
            NULL  AS "created_at",
            NULL  AS "order_id",
            NULL  AS "days_since_order",
            NULL  AS "user_email",
            NULL  AS "status",
            NULL  AS "discount_percentage",
            NULL  AS "vat_percentage",
            NULL  AS "campaign_name",
            NULL  AS "voucher_code",
            NULL  AS "voucher_discount_amount",
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
            COUNT(*) as count,
            0 AS "sort_order" 
        FROM orders O
        JOIN users U ON U.id = O.user_id
        LEFT JOIN vouchers V ON O.voucher_code = V.code
        LEFT JOIN campaigns C ON V.id = C.voucher_id
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
            AND $campaign_name_filter_expression$
            AND $voucher_code_filter_expression$
            AND $voucher_discount_amount_minimum_filter_expression$
            AND $voucher_discount_amount_maximum_filter_expression$
            AND $paid_amount_minimum_filter_expression$
            AND $paid_amount_maximum_filter_expression$
            AND $total_price_minimum_filter_expression$
            AND $total_price_maximum_filter_expression$
            AND $days_since_order_minimum_filter_expression$
            AND $days_since_order_maximum_filter_expression$
        
        UNION ALL

        SELECT
            $created_at_grouping_expression$  AS "created_at",
            $order_id_grouping_expression$  AS "order_id",
            $days_since_order_grouping_expression$  AS "days_since_order",
            $user_email_grouping_expression$  AS "user_email",
            $status_grouping_expression$  AS "status",
            $discount_percentage_grouping_expression$ AS "discount_percentage",
            $vat_percentage_grouping_expression$  AS "vat_percentage",
            $campaign_name_grouping_expression$ AS "campaign_name",
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
            COUNT(*) as count,
            1 AS "sort_order" 
        FROM orders O
        JOIN users U ON U.id = O.user_id
        LEFT JOIN vouchers V ON O.voucher_code = V.code
        LEFT JOIN campaigns C ON V.id = C.voucher_id
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
            AND $campaign_name_filter_expression$
            AND $voucher_code_filter_expression$
            AND $voucher_discount_amount_minimum_filter_expression$
            AND $voucher_discount_amount_maximum_filter_expression$
            AND $paid_amount_minimum_filter_expression$
            AND $paid_amount_maximum_filter_expression$
            AND $total_price_minimum_filter_expression$
            AND $total_price_maximum_filter_expression$
            AND $days_since_order_minimum_filter_expression$
            AND $days_since_order_maximum_filter_expression$
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        ORDER BY sort_order ASC, 1 DESC`;

    return { reportUIConfig, sql, reportFilters };
  }

  async usersReportDefinition(data) {
    const reportUIConfig = {
        title: 'Users Report',
        dataEndpoint: '/api/reports/report-users',
        headerGroups: [
            [
                { key: 'created_at', label: 'Created At', format: 'date_time' },
                { key: 'id', label: 'ID', align: 'right', format: 'text' },
                { key: 'first_name', label: 'First Name', format: 'text' },
                { key: 'last_name', label: 'Last Name', format: 'text' },
                { key: 'email', label: 'Email', format: 'text' },
                { key: 'phone_code', label: 'Phone Code', format: 'text' },
                { key: 'phone', label: 'Phone', format: 'text' },
                { key: 'country_name', label: 'Country', format: 'text' },
                { key: 'gender', label: 'Gender', format: 'text' },
                { key: 'birth_date', label: 'Birth Date', format: 'date' },
                { key: 'is_email_verified', label: 'Is Email Verified', format: 'boolean' },
                { key: 'days_since_creation', label: 'Days Since Creation', format: 'number' },
                { key: 'has_paid_order', label: 'Has Paid Order', format: 'boolean' },
                { key: 'order_total_paid_amount', label: 'Order Total Paid Amount', format: 'currency' },
                { key: 'order_count', label: 'Order Count', format: 'number' },
                { key: 'average_paid_amount', label: 'Average Paid Amount', format: 'currency' },
                { key: 'first_order_created_at', label: 'First Order Created At', format: 'date_time' },
                { key: 'days_since_first_order', label: 'Days Since First Order', format: 'number' },
                { key: 'first_order_total_paid_amount', label: 'First Order Total Paid Amount', format: 'currency' },
                { key: 'days_since_last_order', label: 'Days Since Last Order', format: 'number' },
                { key: 'days_since_last_login', label: 'Days Since Last Login', format: 'number' },
                { key: 'login_count', label: 'Login Count', format: 'number' },
                { key: 'average_weekly_login_count', label: 'Average Weekly Login Count', format: 'number' },
                { key: 'count', label: 'Count', format: 'number' }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "U.created_at",
            filter_expression: "U.created_at = $FILTER_VALUE$",
            minimum_filter_expression: "U.created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "U.created_at <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Create Period",
            groupable: true,
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
        },
        {
            key: "has_paid_order",
            grouping_expression: "CASE WHEN order_stats.order_count > 0 THEN TRUE ELSE FALSE END",
            filter_expression: "CASE WHEN $FILTER_VALUE$ = 'true' THEN order_stats.order_count > 0 ELSE order_stats.order_count = 0 END",
            type: "select",
            label: "Has Paid Order",
            groupable: true,
            options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' }
            ],
        },
        {
            key: "days_since_creation",
            grouping_expression: "DATE_PART('day', CURRENT_DATE - U.created_at)", 
            minimum_filter_expression: "DATE_PART('day', CURRENT_DATE - U.created_at) >= $FILTER_VALUE$",
            maximum_filter_expression: "DATE_PART('day', CURRENT_DATE - U.created_at) <= $FILTER_VALUE$",
            type: "number",
            label: "Days Since Creation",
            step: '1',
            min: 0,
            max: 100000000,
        },
        {
            key: 'first_order_created_at',
            grouping_expression: 'order_stats.first_order_created_at',
            minimum_filter_expression: "order_stats.first_order_created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "order_stats.first_order_created_at <= $FILTER_VALUE$",
            type: 'timestamp',
            label: 'First Order Created At',
        },
        {
            key: 'first_order_total_paid_amount',
            grouping_expression: 'first_order_info.first_order_amount',
            minimum_filter_expression: "first_order_info.first_order_amount >= $FILTER_VALUE$",
            maximum_filter_expression: "first_order_info.first_order_amount <= $FILTER_VALUE$",
            type: 'number',
            label: 'First Order Total Paid Amount',
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "days_since_last_order",
            grouping_expression: "CASE WHEN order_stats.last_order_date IS NOT NULL THEN DATE_PART('day', CURRENT_DATE - order_stats.last_order_date) ELSE NULL END",
            minimum_filter_expression: "CASE WHEN order_stats.last_order_date IS NOT NULL THEN DATE_PART('day', CURRENT_DATE - order_stats.last_order_date) ELSE NULL END >= $FILTER_VALUE$",
            maximum_filter_expression: "CASE WHEN order_stats.last_order_date IS NOT NULL THEN DATE_PART('day', CURRENT_DATE - order_stats.last_order_date) ELSE NULL END <= $FILTER_VALUE$",
            type: "number",
            label: "Days Since Last Order",
            step: '1',
            min: 0,
            max: 100000000,
        },
        {
            key: "order_total_paid_amount",
            grouping_expression: "order_stats.total_paid_amount",
            minimum_filter_expression: "order_stats.total_paid_amount >= $FILTER_VALUE$",
            maximum_filter_expression: "order_stats.total_paid_amount <= $FILTER_VALUE$",
            type: "number",
            label: "Order Total Paid Amount",
            step: '0.01',
            min: 0,
            max: 1000000000000,
        },
        {
            key: "order_count",
            grouping_expression: "order_stats.order_count",
            filter_expression: "",
            minimum_filter_expression: "order_stats.order_count >= $FILTER_VALUE$",
            maximum_filter_expression: "order_stats.order_count <= $FILTER_VALUE$",
            type: "number",
            label: "Order Count",
            step: '1',
            min: 0,
            max: 100000000,
        },
        {
            key: "days_since_last_login",
            grouping_expression: "login_stats.days_since_last_login",
            minimum_filter_expression: "login_stats.days_since_last_login >= $FILTER_VALUE$",
            maximum_filter_expression: "login_stats.days_since_last_login <= $FILTER_VALUE$",
            type: "number",
            label: "Days Since Last Login",
            step: '1',
            min: 0,
            max: 100000000,
        },
        {
            key: "login_count",
            grouping_expression: "login_stats.login_count",
            filter_expression: "",
            minimum_filter_expression: "login_stats.login_count >= $FILTER_VALUE$",
            maximum_filter_expression: "login_stats.login_count <= $FILTER_VALUE$",
            type: "number",
            label: "Login Count",
            step: '1',
            min: 0,
            max: 100000000,
        },
        {
            key: "average_weekly_login_count",
            grouping_expression: "login_stats.average_weekly_login_count",
            minimum_filter_expression: "login_stats.average_weekly_login_count >= $FILTER_VALUE$",
            maximum_filter_expression: "login_stats.average_weekly_login_count <= $FILTER_VALUE$",
            type: "number",
            label: "Average Weekly Login Count",
            step: '0.01',
            min: 0,
            max: 100000000,
        },
        {
            key: "id",
            grouping_expression: "U.id",
            filter_expression: "U.id = $FILTER_VALUE$",
            type: "number_single",
            label: "User ID",
            step: "1",
            min: 0,
            max: 100000000,
        },
        {
            key: "first_name",
            grouping_expression: "U.first_name",
            filter_expression: "STRPOS(LOWER(CAST( U.first_name AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "First Name",
        },
        {
            key: "last_name",
            grouping_expression: "U.last_name",
            filter_expression: "STRPOS(LOWER(CAST( U.last_name AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Last Name",
        },
        {
            key: "email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Email",
        },
        {
            key: "average_paid_amount",
            grouping_expression: "order_stats.average_paid_amount",
            type: "number",
            hideInUI: true,
        },
        {
            key: "days_since_first_order",
            grouping_expression: " CASE WHEN order_stats.first_order_created_at IS NOT NULL THEN DATE_PART('day', CURRENT_DATE - order_stats.first_order_created_at) ELSE NULL END",
            type: "number",
            hideInUI: true,
        },
        {
            key: "phone",
            grouping_expression: "U.phone",
            filter_expression: "",
            type: "text",
            hideInUI: true,
        },
        {
            key: "gender",
            grouping_expression: "genders.type",
            filter_expression: "",
            type: "text",
            hideInUI: true,
        },
        {
            key: "birth_date",
            grouping_expression: "U.birth_date",
            filter_expression: "",
            type: "timestamp",
            hideInUI: true,
        },
        {
            key: "count",
            type: "number",
            hideInUI: true,
        }
    ];

    let sql = `
        WITH order_stats AS (
            SELECT 
                user_id,
                SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS order_count,
                SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END) AS total_paid_amount,
                CASE 
                    WHEN SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) > 0 
                    THEN SUM(CASE WHEN status = 'Paid' THEN paid_amount ELSE 0 END) / SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END)
                    ELSE 0
                END AS average_paid_amount,
                MIN(CASE WHEN status = 'Paid' THEN created_at ELSE NULL END) AS first_order_created_at,
                MAX(CASE WHEN status = 'Paid' THEN created_at ELSE NULL END) AS last_order_date
            FROM (
                -- This subquery ensures we get a row for every user, even if they have no orders
                SELECT u.id AS user_id, o.status, o.paid_amount, o.created_at
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id
                WHERE u.is_active = TRUE
            ) user_orders
            GROUP BY user_id
        ),
        first_order_info AS (
            SELECT 
                o.user_id,
                o.paid_amount AS first_order_amount
            FROM orders o
            JOIN order_stats os ON o.user_id = os.user_id AND o.created_at = os.first_order_created_at
            WHERE o.status = 'Paid'
        ),
        login_stats AS (
            SELECT 
                user_id,
                COUNT(login_id) AS login_count,
                CASE 
                    WHEN MAX(login_created_at) IS NOT NULL 
                    THEN DATE_PART('day', CURRENT_DATE - MAX(login_created_at)) 
                    ELSE NULL 
                END AS days_since_last_login,
                CASE 
                    WHEN MIN(user_created_at) IS NOT NULL
                    THEN COUNT(login_id) / GREATEST(CEIL(DATE_PART('day', CURRENT_DATE - MIN(user_created_at)) / 7), 1)
                    ELSE 0
                END AS average_weekly_login_count
            FROM (
                SELECT 
                    u.id AS user_id, 
                    l.id AS login_id, 
                    l.created_at AS login_created_at,
                    u.created_at AS user_created_at
                FROM users u
                LEFT JOIN logs l ON u.id = l.user_id
            ) user_logins_data
            GROUP BY user_id
        )
        SELECT
            NULL AS "id",
            NULL AS "created_at",
            NULL AS "first_name",
            NULL AS "last_name",
            NULL AS "email",
            NULL AS "phone",
            NULL AS "phone_code",
            NULL AS "country_name",
            NULL AS "gender",
            NULL AS "birth_date",
            NULL AS "is_email_verified",
            NULL AS "days_since_creation",
            NULL AS "has_paid_order",
            NULL AS "average_paid_amount",
            NULL AS "first_order_created_at",
            NULL AS "days_since_first_order",
            NULL AS "first_order_total_paid_amount",
            NULL AS "days_since_last_order",
            NULL AS "days_since_last_login",
            NULL AS "average_weekly_login_count",
            SUM(order_stats.total_paid_amount) AS "order_total_paid_amount",
            SUM(order_stats.order_count) AS "order_count",
            SUM(login_stats.login_count) AS "login_count",
            COUNT(*) AS "count",
            0 AS "sort_order" 
        FROM users U
        LEFT JOIN iso_country_codes icc ON U.iso_country_code_id = icc.id
        LEFT JOIN iso_country_codes cc ON U.country_id = cc.id
        LEFT JOIN genders ON U.gender_id = genders.id
        LEFT JOIN order_stats ON U.id = order_stats.user_id
        LEFT JOIN first_order_info ON U.id = first_order_info.user_id
        LEFT JOIN login_stats ON U.id = login_stats.user_id
        WHERE U.is_active = TRUE
            AND $id_filter_expression$
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
            AND $has_paid_order_filter_expression$
            AND $order_total_paid_amount_minimum_filter_expression$
            AND $order_total_paid_amount_maximum_filter_expression$
            AND $order_count_minimum_filter_expression$
            AND $order_count_maximum_filter_expression$
            AND $first_order_created_at_minimum_filter_expression$
            AND $first_order_created_at_maximum_filter_expression$
            AND $first_order_total_paid_amount_minimum_filter_expression$
            AND $first_order_total_paid_amount_maximum_filter_expression$
            AND $days_since_last_order_minimum_filter_expression$
            AND $days_since_last_order_maximum_filter_expression$
            AND $days_since_last_login_minimum_filter_expression$
            AND $days_since_last_login_maximum_filter_expression$
            AND $login_count_minimum_filter_expression$
            AND $login_count_maximum_filter_expression$
            AND $average_weekly_login_count_minimum_filter_expression$
            AND $average_weekly_login_count_maximum_filter_expression$

        UNION ALL

        SELECT
            $id_grouping_expression$ AS "id",
            $created_at_grouping_expression$ AS "created_at",
            $first_name_grouping_expression$ AS "first_name",
            $last_name_grouping_expression$  AS "last_name",
            $email_grouping_expression$  AS "email",
            $phone_grouping_expression$  AS "phone",
            $phone_code_grouping_expression$ AS "phone_code",
            $country_name_grouping_expression$ AS "country_name",
            $gender_grouping_expression$ AS "gender",
            $birth_date_grouping_expression$ AS "birth_date",
            $is_email_verified_grouping_expression$ AS "is_email_verified",
            $days_since_creation_grouping_expression$ AS "days_since_creation",
            $has_paid_order_grouping_expression$ AS "has_paid_order",

            $average_paid_amount_grouping_expression$ AS "average_paid_amount",
            $first_order_created_at_grouping_expression$ AS "first_order_created_at",
            $days_since_first_order_grouping_expression$ AS "days_since_first_order",
            $first_order_total_paid_amount_grouping_expression$ AS "first_order_total_paid_amount",
            $days_since_last_order_grouping_expression$ AS "days_since_last_order",
            $days_since_last_login_grouping_expression$ AS "days_since_last_login",
            $average_weekly_login_count_grouping_expression$ AS "average_weekly_login_count",
            SUM(order_stats.total_paid_amount) AS "order_total_paid_amount",
            SUM(order_stats.order_count) AS "order_count",
            SUM(login_stats.login_count) AS "login_count",
            COUNT(*) AS "count",
            1 AS "sort_order" 
        FROM users U
        LEFT JOIN iso_country_codes icc ON U.iso_country_code_id = icc.id
        LEFT JOIN iso_country_codes cc ON U.country_id = cc.id
        LEFT JOIN genders ON U.gender_id = genders.id
        LEFT JOIN order_stats ON U.id = order_stats.user_id
        LEFT JOIN first_order_info ON U.id = first_order_info.user_id
        LEFT JOIN login_stats ON U.id = login_stats.user_id
        WHERE U.is_active = TRUE
            AND $id_filter_expression$
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
            AND $has_paid_order_filter_expression$
            AND $order_total_paid_amount_minimum_filter_expression$
            AND $order_total_paid_amount_maximum_filter_expression$
            AND $order_count_minimum_filter_expression$
            AND $order_count_maximum_filter_expression$
            AND $first_order_created_at_minimum_filter_expression$
            AND $first_order_created_at_maximum_filter_expression$
            AND $first_order_total_paid_amount_minimum_filter_expression$
            AND $first_order_total_paid_amount_maximum_filter_expression$
            AND $days_since_last_order_minimum_filter_expression$
            AND $days_since_last_order_maximum_filter_expression$
            AND $days_since_last_login_minimum_filter_expression$
            AND $days_since_last_login_maximum_filter_expression$
            AND $login_count_minimum_filter_expression$
            AND $login_count_maximum_filter_expression$
            AND $average_weekly_login_count_minimum_filter_expression$
            AND $average_weekly_login_count_maximum_filter_expression$
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
        ORDER BY sort_order ASC, 1 DESC`;
    
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
          },
          {
            key: "end_date", 
            grouping_expression: "",
            filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date + INTERVAL '1 day')",
            type: "timestamp",
            label: "End Date",
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
      },
      {
        key: "end_date", 
        grouping_expression: "",
        filter_expression: "DATE_TRUNC('day', $FILTER_VALUE$::date + INTERVAL '1 day')",
        type: "timestamp",
        label: "End Date",
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

  async notificationsReportDefinition(data) {
    const reportUIConfig = {
        title: 'Notifications Report',
        dataEndpoint: '/api/reports/report-notifications',
        headerGroups: [
            [
                { key: 'created_at', label: 'Created At', format: 'date_time' },
                { key: 'type', label: 'Notification Type', format: 'text' },
                { key: 'user_email', label: 'User Email', format: 'text' },
                { key: 'status', label: 'Status', format: 'text' },
                { key: 'subject' , label: 'Subject', format: 'text' },
                { key: 'text_content', label: 'Text Content', format: 'text' },
                { key: 'count', label: 'Count', format: 'number' }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "N.created_at",
            filter_expression: "N.created_at = $FILTER_VALUE$",
            minimum_filter_expression: "N.created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "N.created_at <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
        },
        {
            key: "type",
            grouping_expression: "N.type",
            filter_expression: "N.type = $FILTER_VALUE$",
            type: "select",
            label: "Notification Type",
            options: [
                { value: 'Email', label: 'Email' },
                { value: 'Notification', label: 'Notification' },
            ],
            groupable: true,
        },
        {
            key: "user_email",
            grouping_expression: "N.recipient_email",
            filter_expression: "STRPOS(LOWER(CAST( N.recipient_email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "User Email",
            groupable: true,
        },
        {
            key: "status",
            grouping_expression: "N.status",
            filter_expression: "N.status = $FILTER_VALUE$",
            type: 'select',
            label: 'Status',
            options: [
                { value: 'pending', label: 'Pending' },
                { value: 'sending', label: 'Sending' },
                { value: 'sent', label: 'Sent' },
                { value: 'seen', label: 'Seen' }
            ],
            groupable: true,
        },
        {
            key: "subject",
            grouping_expression: "N.subject",
            filter_expression: "STRPOS(LOWER(CAST( N.subject AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Subject",
        },
        {
            key: "text_content",
            grouping_expression: "N.text_content",
            filter_expression: "STRPOS(LOWER(CAST( N.text_content AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
            label: "Text Content",
        },
        {
            key: "count",
            type: "number",
            hideInUI: true
        },
    ];

    let sql = `
        SELECT
            NULL AS "created_at",
            NULL AS "type",
            NULL AS "user_email",
            NULL AS "status",
            NULL AS "subject",
            NULL AS "text_content",
            COUNT(*) AS "count",
            0 AS "sort_order"
        FROM emails N
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $type_filter_expression$
            AND $user_email_filter_expression$
            AND $status_filter_expression$
            AND $subject_filter_expression$
            AND $text_content_filter_expression$
        
        UNION ALL

        SELECT
            $created_at_grouping_expression$ AS "created_at",
            $type_grouping_expression$ AS "type",
            $user_email_grouping_expression$ AS "user_email",
            $status_grouping_expression$ AS "status",
            $subject_grouping_expression$ AS "subject",
            $text_content_grouping_expression$ AS "text_content",
            COUNT(*) AS "count",
            1 AS "sort_order"
        FROM emails N
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $type_filter_expression$
            AND $user_email_filter_expression$
            AND $status_filter_expression$
            AND $subject_filter_expression$
            AND $text_content_filter_expression$
        GROUP BY 1, 2, 3, 4, 5, 6
        ORDER BY sort_order ASC, 1 DESC`;

    return { reportUIConfig, sql, reportFilters };
  }

  async notificationsStatusReportDefinition(data) {
    const reportUIConfig = {
        title: 'Notifications Status Report',
        dataEndpoint: '/api/reports/report-notifications-status',
        headerGroups: [
            [   
                { key: 'created_at', label: 'Created At', format: 'date_time' },
                { key: 'name', label: 'Notification Campaign Name', format: 'text' },
                { key: 'subject', label: 'Subject', format: 'text' },
                { key: 'users_count', label: 'Users Count', format: 'number' },
                { key: 'status_pending', label: 'Pending', format: 'number' },
                { key: 'status_sent', label: 'Sent', format: 'number' },
                { key: 'status_seen', label: 'Seen', format: 'number' }
            ]
        ]
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "N.created_at",
            minimum_filter_expression: "N.created_at >= $FILTER_VALUE$",
            maximum_filter_expression: "N.created_at <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Period",
            groupable: true,
        },
        {
            key: "name",
            grouping_expression: "N.name",
            filter_expression: "STRPOS(LOWER(CAST(N.name AS text)), LOWER($FILTER_VALUE$)) > 0",
            type: "text",
            label: "Notification Campaign Name",
        },
        {
            key: "subject",
            grouping_expression: "E.subject",
            filter_expression: "STRPOS(LOWER(CAST(E.subject AS text)), LOWER($FILTER_VALUE$)) > 0",
            type: "text",
            label: "Subject",
        }
    ];

    const sql = `
        SELECT
            NULL AS "created_at",
            NULL AS name,
            NULL AS subject,
            COUNT(E.id) AS users_count,
            COUNT(CASE WHEN E.status = 'queued' THEN 1 END) AS status_pending,
            COUNT(CASE WHEN E.status = 'sent' THEN 1 END) AS status_sent,
            COUNT(CASE WHEN E.status = 'seen' THEN 1 END) AS status_seen,
            0 AS "sort_order"
        FROM notifications N	
        JOIN emails E ON N.id = E.notification_id
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $name_filter_expression$
            AND $subject_filter_expression$

        UNION ALL

        SELECT
            $created_at_grouping_expression$ AS "created_at",
            $name_grouping_expression$ as name,
            $subject_grouping_expression$ as subject,
            COUNT(E.id) AS users_count,
            COUNT(CASE WHEN E.status = 'queued' THEN 1 END) AS status_pending,
            COUNT(CASE WHEN E.status = 'sent' THEN 1 END) AS status_sent,
            COUNT(CASE WHEN E.status = 'seen' THEN 1 END) AS status_seen,
            1 AS "sort_order"
        FROM notifications N	
        JOIN emails E ON N.id = E.notification_id
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $name_filter_expression$
            AND $subject_filter_expression$
        GROUP BY 1, 2, 3
        ORDER BY sort_order ASC, 1 DESC`;

    return { reportUIConfig, sql, reportFilters };
  }   

  async campaignsReportDefinition(data) {
    const reportUIConfig = {
        title: 'Campaigns Report',
        dataEndpoint: '/api/reports/report-campaigns',
        headerGroups: [
            [
                { key: 'id', label: 'ID', align: 'right', format: 'text' },
                { key: 'name', label: 'Campaign Name', format: 'text' },
                { key: 'start_date', label: 'Active From', format: 'date_time' },
                { key: 'end_date', label: 'Active Until', format: 'date_time' },
                { key: 'status', label: 'Status', format: 'text' },
                { key: 'target_group_name', label: 'Target Group', format: 'text' },
                { key: 'users_count', label: 'Users in Target Group', format: 'number' },
                { key: 'orders_count', label: 'Orders Count', format: 'number' },
                { key: 'users_with_orders_count', label: 'Users with Orders Count', format: 'number' },
                { key: 'orders_total_paid_amount', label: 'Order Total Paid Amount', format: 'currency' },
                { key: 'average_order_amount', label: 'Average Order Amount', format: 'currency' },
                { key: 'conversion_rate', label: 'Conversion Rate', format: 'percentage' },
                { key: 'count', label: 'Count', format: 'number' }
            ]
        ],
    };

    const reportFilters = [
        {
            key: "activity_date",
            grouping_expression: `start_date AS "start_date", end_date AS "end_date"`,
            minimum_filter_expression: "C.start_date >= $FILTER_VALUE$",
            maximum_filter_expression: "C.end_date <= $FILTER_VALUE$",
            type: "timestamp",
            label: "Activity Date",
        },
        {
            key: "id",
            grouping_expression: "id",
            filter_expression: "C.id = $FILTER_VALUE$",
            type: "number_single",
            label: "Campaign ID",
            step: "1",
            min: 0,
            max: 100000000,
        },
        {
            key: "name",
            grouping_expression: "name",
            filter_expression: "STRPOS(LOWER(CAST(C.name AS text)), LOWER($FILTER_VALUE$)) > 0",
            type: "text",
            label: "Campaign Name",
        },  
        {
            key: "status",
            grouping_expression: "status",
            filter_expression: "C.status = $FILTER_VALUE$",
            type: "select",
            label: "Status",
            options: [
                { value: 'Active', label: 'Active' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Expired voucher', label: 'Expired voucher' }
            ],
        },
        {
            key: "target_group_name",
            grouping_expression: "target_group_name",
            filter_expression: "TGU.target_group_id = $FILTER_VALUE$",
            type: "select",
            label: "Target Group",
            fetchFrom: "/crud/target-groups",
            displayKey: 'name',
            valueKey: 'id',
        },
        {
            key: "users_count",
            grouping_expression: "users_count",
            minimum_filter_expression: "CASE WHEN C.final_user_count IS NOT NULL THEN C.final_user_count ELSE TGU.user_count END >= $FILTER_VALUE$",
            maximum_filter_expression: "CASE WHEN C.final_user_count IS NOT NULL THEN C.final_user_count ELSE TGU.user_count END <= $FILTER_VALUE$",
            type: "number",
            label: "Users in Target Group",
            step: "1",
            min: 0,
            max: 100000000,
        },
        {
            key: "users_with_orders_count",
            grouping_expression: "users_with_orders_count",
            minimum_filter_expression: "COALESCE(CO.users_with_orders_count, 0) >= $FILTER_VALUE$",
            maximum_filter_expression: "COALESCE(CO.users_with_orders_count, 0) <= $FILTER_VALUE$",
            type: "number",
            label: "Users with Orders Count",
            step: "1",
            min: 0,
            max: 100000000,
        },
        {
            key: "orders_count",
            grouping_expression: "orders_count",
            minimum_filter_expression: "COALESCE(CO.orders_count, 0) >= $FILTER_VALUE$",
            maximum_filter_expression: "COALESCE(CO.orders_count, 0) <= $FILTER_VALUE$",
            type: "number",
            label: "Orders Count",
            step: "1",
            min: 0,
            max: 100000000,
        },
        {
            key: "orders_total_paid_amount",
            grouping_expression: "orders_total_paid_amount",
            minimum_filter_expression: "COALESCE(CO.orders_total_paid_amount, 0) >= $FILTER_VALUE$",
            maximum_filter_expression: "COALESCE(CO.orders_total_paid_amount, 0) <= $FILTER_VALUE$",
            type: "number",
            label: "Total Order Amount",
            step: "0.01",
            min: 0,
            max: 1000000000000,
        },
        {
            key: "average_order_amount",
            grouping_expression: "average_order_amount",
            minimum_filter_expression: `CASE WHEN COALESCE(CO.orders_count, 0) > 0 THEN COALESCE(CO.orders_total_paid_amount / CO.orders_count, 0) ELSE 0 END >= $FILTER_VALUE$`,
            maximum_filter_expression: `CASE WHEN COALESCE(CO.orders_count, 0) > 0 THEN COALESCE(CO.orders_total_paid_amount / CO.orders_count, 0) ELSE 0 END <= $FILTER_VALUE$`,
            type: "number",
            label: "Average Order Amount",
            step: "0.01",
            min: 0,
            max: 1000000000000,
        },
        {
            key: "conversion_rate",
            grouping_expression: "conversion_rate",
            minimum_filter_expression: "CASE WHEN C.final_user_count IS NOT NULL AND C.final_user_count > 0 THEN ROUND((COALESCE(CO.orders_count, 0)::float / C.final_user_count * 100)::numeric, 2) WHEN COALESCE(TGU.user_count, 0) > 0 THEN ROUND((COALESCE(CO.orders_count, 0)::float / TGU.user_count * 100)::numeric, 2) ELSE 0 END >= $FILTER_VALUE$",
            maximum_filter_expression: "CASE WHEN C.final_user_count IS NOT NULL AND C.final_user_count > 0 THEN ROUND((COALESCE(CO.orders_count, 0)::float / C.final_user_count * 100)::numeric, 2) WHEN COALESCE(TGU.user_count, 0) > 0 THEN ROUND((COALESCE(CO.orders_count, 0)::float / TGU.user_count * 100)::numeric, 2) ELSE 0 END <= $FILTER_VALUE$",
            type: "number",
            label: "Conversion Rate",
            step: "0.01",
            min: 0,
            max: 100,
        },
        {
            key: "count",
            type: "number",
            hideInUI: true,
        }
    ];

    let sql = `
        WITH target_group_users AS (
            SELECT 
                tg.id AS target_group_id, 
                COUNT(DISTINCT utg.user_id) AS user_count
            FROM target_groups tg
            LEFT JOIN user_target_groups utg ON tg.id = utg.target_group_id
            GROUP BY tg.id
        ),
        campaign_orders AS (
            SELECT 
                c.id AS campaign_id,
                COUNT(DISTINCT o.id) AS orders_count,
                COUNT(DISTINCT o.user_id) AS users_with_orders_count,
                COALESCE(SUM(o.paid_amount), 0) AS orders_total_paid_amount
            FROM campaigns c
            LEFT JOIN vouchers v ON c.voucher_id = v.id
            LEFT JOIN orders o ON o.voucher_code = v.code AND o.status = 'Paid'
            GROUP BY c.id
        ),
        campaign_statistics AS (
            SELECT
                C.id,
                C.name,
                C.start_date,
                C.end_date,
                C.status,
                TG.name AS target_group_name,
                CASE WHEN C.final_user_count IS NOT NULL 
                    THEN C.final_user_count 
                    ELSE COALESCE(TGU.user_count, 0) 
                END AS users_count,
                COALESCE(CO.orders_count, 0) AS orders_count,
                COALESCE(CO.users_with_orders_count, 0) AS users_with_orders_count,
                COALESCE(CO.orders_total_paid_amount, 0) AS orders_total_paid_amount,
                CASE 
                    WHEN COALESCE(CO.orders_count, 0) > 0 
                    THEN COALESCE(CO.orders_total_paid_amount / CO.orders_count, 0)
                    ELSE 0
                END AS average_order_amount,
                CASE
                    WHEN C.final_user_count IS NOT NULL AND C.final_user_count > 0
                        THEN ROUND((COALESCE(CO.orders_count, 0)::float / C.final_user_count * 100)::numeric, 2)
                    WHEN COALESCE(TGU.user_count, 0) > 0
                        THEN ROUND((COALESCE(CO.orders_count, 0)::float / TGU.user_count * 100)::numeric, 2)
                    ELSE 0
                END AS conversion_rate
            FROM campaigns C
            LEFT JOIN target_groups TG ON C.target_group_id = TG.id
            LEFT JOIN target_group_users TGU ON TG.id = TGU.target_group_id
            LEFT JOIN campaign_orders CO ON C.id = CO.campaign_id
            WHERE C.is_active = TRUE
                AND $id_filter_expression$
                AND $name_filter_expression$
                AND $activity_date_minimum_filter_expression$
                AND $activity_date_maximum_filter_expression$
                AND $status_filter_expression$
                AND $target_group_name_filter_expression$
            GROUP BY C.id, C.name, C.start_date, C.end_date, C.status, TG.name, C.final_user_count, TGU.user_count, 
                CO.orders_count, CO.users_with_orders_count, CO.orders_total_paid_amount
            HAVING TRUE 
                AND $users_count_minimum_filter_expression$
                AND $users_count_maximum_filter_expression$
                AND $orders_count_minimum_filter_expression$
                AND $orders_count_maximum_filter_expression$
                AND $users_with_orders_count_minimum_filter_expression$
                AND $users_with_orders_count_maximum_filter_expression$
                AND $orders_total_paid_amount_minimum_filter_expression$
                AND $orders_total_paid_amount_maximum_filter_expression$
                AND $average_order_amount_minimum_filter_expression$
                AND $average_order_amount_maximum_filter_expression$
                AND $conversion_rate_minimum_filter_expression$
                AND $conversion_rate_maximum_filter_expression$
        )
        
        SELECT
            NULL AS "id",
            NULL AS "name",
            NULL AS "start_date",
            NULL AS "end_date",
            NULL AS "status", 
            NULL AS "target_group_name",
            NULL AS "average_order_amount",
            NULL AS "conversion_rate",
            SUM(users_count) AS "users_count",
            SUM(orders_count) AS "orders_count",
            SUM(users_with_orders_count) AS "users_with_orders_count",
            SUM(orders_total_paid_amount) AS "orders_total_paid_amount",
            COUNT(*) AS "count",
            0 AS "sort_order"
        FROM campaign_statistics CS
        WHERE TRUE
        
        UNION ALL
        
        SELECT
            $id_grouping_expression$ AS "id",
            $name_grouping_expression$ AS "name",
            $activity_date_grouping_expression$,
            $status_grouping_expression$ AS "status",
            $target_group_name_grouping_expression$ AS "target_group_name",
            $average_order_amount_grouping_expression$ AS "average_order_amount",
            $conversion_rate_grouping_expression$ AS "conversion_rate",
            users_count AS "users_count",
            orders_count AS "orders_count",
            users_with_orders_count AS "users_with_orders_count",
            orders_total_paid_amount AS "orders_total_paid_amount",
            1 AS "count",
            1 AS "sort_order"
        FROM campaign_statistics
        WHERE TRUE
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
        ORDER BY sort_order ASC, 1 DESC`;

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

  #testReplacePlaceholders(sql, values) {
    return sql.replace(/\$\d+/g, match => {
        const index = parseInt(match.slice(1)) - 1;
        return values[index];
    });
  }
}

module.exports = ReportService;
