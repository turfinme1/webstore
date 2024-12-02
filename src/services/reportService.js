const { ASSERT_USER } = require("../serverConfigurations/assert");
const { STATUS_CODES } = require("../serverConfigurations/constants");

class ReportService {
  constructor() {
    this.reports = {
        "report-orders-by-user": this.getOrdersByUserReport.bind(this),
        "report-logs": this.getLogsReport.bind(this),
        "report-orders": this.getOrdersReport.bind(this),
    }
  }

  async getReport(data) {
    ASSERT_USER(this.reports[data.params.report], `Report ${data.params.report} not found`, 
        { 
            code: STATUS_CODES.INVALID_QUERY_PARAMS, 
            long_description: `Report ${data.params.report} not found` 
        }
    );

    return await this.reports[data.params.report](data);
  }
    
  async getOrdersByUserReport(data) {
    const reportUIConfig =  {
        title: 'Orders Report by User',
        dataEndpoint: '/api/reports/report-orders-by-user',
        filters: [
            {
                key: 'order_total',
                label: 'Order Amount',
                type: 'number',
                step: '0.01',
                min: 0,
                max: 100000000
            },
            {
                key: 'user_email',
                label: 'User Email',
                type: 'text',
                placeholder: 'Enter user email'
            },
            {
              key: 'user_id',
              label: 'User ID',
              type: "number_single",
              placeholder: 'Enter user ID'
            },
        ],
        tableTemplate: 'groupedHeaders',
        headerGroups: [
            [
                { label: 'User Email', rowspan: 2 },
                { label: 'User ID', rowspan: 2 },
                { label: 'Last Day', colspan: 2 },
                { label: 'Last Week', colspan: 2 },
                { label: 'Last Month', colspan: 2 },
                { label: 'Last Year', colspan: 2 }
            ],
            [
                { label: 'Count' },
                { label: 'Total Order Amount' },
                { label: 'Count' },
                { label: 'Total Order Amount' },
                { label: 'Count' },
                { label: 'Total Order Amount' },
                { label: 'Count' },
                { label: 'Total Order Amount' }
            ]
        ],
        columns: [
          { key: 'user_email', label: 'User Email', format: 'text' },
          { key: 'user_id', label: 'User ID', align: 'right', format: 'text' },
          { key: 'orders_last_day', label: 'Count', align: 'right', format: 'number' },
          { key: 'total_last_day', label: 'Total Order Amount', align: 'right', format: 'currency' },
          { key: 'orders_last_week', label: 'Count', align: 'right', format: 'number' },
          { key: 'total_last_week', label: 'Total Order Amount', align: 'right', format: 'currency' },
          { key: 'orders_last_month', label: 'Count', align: 'right', format: 'number' },
          { key: 'total_last_month', label: 'Total Order Amount', align: 'right', format: 'currency' },
          { key: 'orders_last_year', label: 'Count', align: 'right', format: 'number' },
          { key: 'total_last_year', label: 'Total Order Amount', align: 'right', format: 'currency' }
        ]
    };

    if(data.body.metadataRequest === true) {
        return reportUIConfig;
    }

    const INPUT_DATA = {
      user_email_filter_value: data.body.user_email || "",
      user_id_filter_value: data.body.user_id || "",
      order_total_minimum_filter_value: data.body.order_total_minimum || "0",
      order_total_maximum_filter_value: data.body.order_total_maximum || "99999999999",
    };

    const reportFilters = [
        {
            key: "user_email",
            grouping_expression: "U.email",
            filter_expression: "STRPOS(LOWER(CAST( U.email AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
        },
        {
            key: "user_id",
            grouping_expression: "U.id",
            filter_expression: "U.id = $FILTER_VALUE$",
            type: "select",
        },
        {
            key: "order_total_minimum",
            grouping_expression: "",
            filter_expression: "O.total_price >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "order_total_maximum",
            grouping_expression: "",
            filter_expression: "O.total_price <= $FILTER_VALUE$",
            type: "number",
        },
    ];

    let sql = `
        SELECT
            $user_email_grouping_expression$ AS "user_email",
            $user_id_grouping_expression$ AS "user_id",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN 1 END) AS "orders_last_day",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 day' THEN O.total_price END), 0) AS "total_last_day",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN 1 END) AS "orders_last_week",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 week' THEN O.total_price END), 0) AS "total_last_week",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN 1 END) AS "orders_last_month",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 month' THEN O.total_price END), 0) AS "total_last_month",
            COUNT(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN 1 END) AS "orders_last_year",
            COALESCE(SUM(CASE WHEN O.created_at >= NOW() - INTERVAL '1 year' THEN O.total_price END), 0) AS "total_last_year"
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
        ORDER BY 1 ASC`;

    const replacedQueryData = this.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
    const result = await data.dbConnection.query(replacedQueryData.sql, replacedQueryData.insertValues);
    return { rows: result.rows, filters: reportFilters };
  }

  async getLogsReport(data) {
    const reportUIConfig =  {
        title: 'Logs Report',
        dataEndpoint: '/api/reports/report-logs',
        filters: [
            {
                key: 'created_at',
                label: 'Period',
                type: 'timestamp',
                groupable: true
            },
            {
                key: 'status_code',
                label: 'Status Code',
                type: 'select',
                placeholder: 'Enter status code',
                options: Object.keys(STATUS_CODES).map(key => ({ value: STATUS_CODES[key], label: `${key} (${STATUS_CODES[key]})` })),
                groupable: true
            },
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'select',
                placeholder: 'Enter log level',
                options: [
                    { value: 'INFO', label: 'INFO' },
                    { value: 'ERROR', label: 'ERROR' },
                ],
                groupable: true
            },
        ],
        tableTemplate: 'groupedHeaders',
        headerGroups: [
            [
                { label: 'ID', rowspan: 2 },
                { label: 'Created At', rowspan: 2 },
                { label: 'Status Code', rowspan: 2 },
                { label: 'Log Level', rowspan: 2 },
                { label: 'Short Description', rowspan: 2 },
                { label: 'Long Description', rowspan: 2 },
                { label: 'Debug Info', rowspan: 2 },
                { label: 'User ID', rowspan: 2 },
                { label: 'Admin User ID', rowspan: 2 },
                { label: 'Count', rowspan: 2 }
            ]
        ],
        columns: [
          { key: 'id', label: 'ID', align: 'right', format: 'text' },
          { key: 'created_at', label: 'Created At', align: 'right', format: 'date_time' },
          { key: 'status_code', label: 'Status Code', align: 'right', format: 'text' },
          { key: 'log_level', label: 'Log Level', align: 'right', format: 'text' },
          { key: 'short_description', label: 'Short Description', align: 'right', format: 'text' },
          { key: 'long_description', label: 'Long Description', align: 'right', format: 'text' },
          { key: 'debug_info', label: 'Debug Info', align: 'right', format: 'text' },
          { key: 'user_id', label: 'User ID', align: 'right', format: 'text' },
          { key: 'admin_user_id', label: 'Admin User ID', align: 'right', format: 'text' },
          { key: 'count', label: 'Count', align: 'right', format: 'number' }
        ]
    };

    if(data.body.metadataRequest === true) {
        return reportUIConfig;
    }

    const INPUT_DATA = {
      created_at_minimum_filter_value: data.body.created_at_minimum || "",
      created_at_maximum_filter_value: data.body.created_at_maximum || "",
      status_code_filter_value: data.body.status_code || "",
      log_level_filter_value: data.body.log_level || "",
      created_at_grouping_select_value: data.body.created_at_grouping_select_value,
      status_code_grouping_select_value: data.body.status_code_grouping_select_value,
      log_level_grouping_select_value: data.body.log_level_grouping_select_value,
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
            filter_expression: "L.status_code = $FILTER_VALUE$",
            type: "text",
        },
        {
            key: "log_level",
            grouping_expression: "L.log_level",
            filter_expression: "STRPOS(LOWER(CAST( L.log_level AS text )), LOWER( $FILTER_VALUE$ )) > 0",
            type: "text",
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
        GROUP BY GROUPING SETS (
            (1, 2, 3, 4, 5, 6, 7, 8, 9),
            ()
        )
        ORDER BY 1 DESC`;
    
    const replacedQueryData = this.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
    const result = await data.dbConnection.query(replacedQueryData.sql, replacedQueryData.insertValues);
    return { rows: result.rows, filters: reportFilters };
  }

  async getOrdersReport(data) {
    const reportUIConfig = {
        title: 'Orders Report',
        dataEndpoint: '/api/reports/report-orders',
        filters: [
            {
                key: 'created_at',
                label: 'Period',
                type: 'timestamp',
                groupable: true
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Delivered', label: 'Delivered' },
                    { value: 'Cancelled', label: 'Cancelled' }
                ],
                groupable: true
            },
            {
                key: "total_price",
                label: "Total Price",
                type: "number",
                step: '0.01',
                min: 0,
                max: 100000000
            }
        ],
        tableTemplate: 'groupedHeaders',
        headerGroups: [
            [
                { label: 'Created At', rowspan: 2 },
                { label: 'Order Hash', rowspan: 2 },
                { label: 'User Email', rowspan: 2 },
                { label: 'Status', rowspan: 2 },
                { label: 'Total Price', rowspan: 2 },
                { label: 'Discount %', rowspan: 2 },
                { label: 'Discount', rowspan: 2 },
                { label: 'VAT %', rowspan: 2 },
                { label: 'VAT', rowspan: 2 },
                { label: 'Total With VAT', rowspan: 2 },
                { label: 'Count', rowspan: 2 }
            ]
        ],
        columns: [
            { key: 'created_at', label: 'Created At', format: 'date_time' },
            { key: 'order_hash', label: 'Order Hash', format: 'text' },
            { key: 'user_email', label: 'User Email', format: 'text' },
            { key: 'status', label: 'Status', format: 'text' },
            { key: 'total_price', label: 'Total Price', align: 'right', format: 'currency' },
            { key: 'discount_percentage', label: 'Discount %', align: 'right', format: 'percentage' },
            { key: 'discount_amount', label: 'Discount', align: 'right', format: 'currency' },
            { key: 'vat_percentage', label: 'VAT %', align: 'right', format: 'percentage' },
            { key: 'vat_amount', label: 'VAT', align: 'right', format: 'currency' },
            { key: 'total_price_with_vat', label: 'Total With VAT', align: 'right', format: 'currency' },
            { key: 'count', label: 'Count', align: 'right', format: 'number' }
        ]
    };

    if (data.body.metadataRequest === true) {
        return reportUIConfig;
    }

    const INPUT_DATA = {
        created_at_minimum_filter_value: data.body.created_at_minimum || "",
        created_at_maximum_filter_value: data.body.created_at_maximum || "",
        status_filter_value: data.body.status || "",
        total_price_minimum_filter_value: data.body.total_price_minimum || "0",
        total_price_maximum_filter_value: data.body.total_price_maximum || "99999999999",
        created_at_grouping_select_value: data.body.created_at_grouping_select_value,
        status_grouping_select_value: data.body.status_grouping_select_value,
    };

    const reportFilters = [
        {
            key: "created_at",
            grouping_expression: "O.created_at",
            filter_expression: "O.created_at = $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "order_hash",
            grouping_expression: "O.order_hash",
            filter_expression: "",
            type: "text",
        },
        {
            key: "user_email",
            grouping_expression: "U.email",
            filter_expression: "",
            type: "text",
        },
        {
            key: "status",
            grouping_expression: "O.status",
            filter_expression: "O.status = $FILTER_VALUE$",
            type: "text",
        },
        {
            key: "discount_percentage",
            grouping_expression: "ld.discount_percentage",
            filter_expression: "",
            type: "number",
        },
        {
            key: "vat_percentage",
            grouping_expression: "vat.vat_percentage",
            filter_expression: "",
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
        }
    ];

    let sql = `
        WITH vat AS (
            SELECT vat_percentage FROM app_settings LIMIT 1
        ),
        largest_discount AS (
            SELECT COALESCE(MAX(discount_percentage), 0) AS discount_percentage
            FROM promotions
            WHERE is_active = TRUE
              AND NOW() BETWEEN start_date AND end_date
        )
        SELECT
            $created_at_grouping_expression$  AS "created_at",
            $order_hash_grouping_expression$  AS "order_hash",
            $user_email_grouping_expression$  AS "user_email",
            $status_grouping_expression$  AS "status",
            $discount_percentage_grouping_expression$ AS "discount_percentage",
            $vat_percentage_grouping_expression$  AS "vat_percentage",
            SUM(ROUND(O.total_price * ld.discount_percentage / 100, 2)) AS "discount_amount",
            SUM(ROUND(O.total_price * (1 - ld.discount_percentage / 100) * vat.vat_percentage / 100, 2))  AS "vat_amount",
            SUM(ROUND(O.total_price * (1 - ld.discount_percentage / 100) * (1 + vat.vat_percentage / 100), 2))  AS "total_price_with_vat",
            SUM(paid_amount) AS "paid_amount",
            SUM(O.total_price) AS "total_price",
            COUNT(*) as count
        FROM orders O
        CROSS JOIN vat
        CROSS JOIN largest_discount ld
        JOIN users U ON U.id = O.user_id
        WHERE TRUE
            AND $created_at_minimum_filter_expression$
            AND $created_at_maximum_filter_expression$
            AND $status_filter_expression$
            AND $total_price_minimum_filter_expression$
            AND $total_price_maximum_filter_expression$
        GROUP BY GROUPING SETS (
            (1, 2, 3, 4, 5, 6),
            ()
        )
        ORDER BY 1 DESC
        LIMIT 1000`;

    const replacedQueryData = this.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
    const result = await data.dbConnection.query(replacedQueryData.sql, replacedQueryData.insertValues);
    return { rows: result.rows, filters: reportFilters };
  }
  
  replaceFilterExpressions(sql, reportFilters, INPUT_DATA) {
    let insertValues = [];
    const hasAnyGrouping = reportFilters.some(filter =>INPUT_DATA[`${filter.key}_grouping_select_value`]);

    for (let reportFilter of reportFilters) {
      const groupingValue = INPUT_DATA[`${reportFilter.key}_grouping_select_value`];
      let groupingExpr = "'All'"; // default

      if (groupingValue) {
        if (reportFilter.type === 'timestamp') {
          ASSERT_USER(groupingValue.match(/minute|hour|day|week|month|year/), `Invalid grouping value ${groupingValue}`, { code: STATUS_CODES.INVALID_BODY, long_description: `Invalid grouping value ${groupingValue}` });
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
}

module.exports = ReportService;
