const { ASSERT_USER } = require("../serverConfigurations/assert");
const { STATUS_CODES } = require("../serverConfigurations/constants");

class ReportService {
  constructor() {
    this.reports = {
        "report-orders-by-user": this.getOrdersByUserReport.bind(this),
        "report-logs": this.getLogsReport.bind(this),
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
            // {
            //     key: 'date_range',
            //     label: 'Order Date',
            //     type: 'timestamp'
            // }
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
          { key: 'user_email', label: 'User Email' },
          { key: 'user_id', label: 'User ID', align: 'right' },
          { key: 'orders_last_day', label: 'Count', align: 'right' },
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
      order_total_minimum_filter_value: data.body.order_total_min || "0",
      order_total_maximum_filter_value: data.body.order_total_max || "9999999",
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
        ORDER BY $user_email_grouping_expression$ ASC`;

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
                key: 'user_id',
                label: 'User ID',
                type: 'number_single',
                placeholder: 'Enter user ID'
            },
            {
                key: 'status_code',
                label: 'Status Code',
                type: 'text',
                placeholder: 'Enter status code'
            },
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'text',
                placeholder: 'Enter log level'
            },
            {
                key: 'date_range',
                label: 'Log Date',
                type: 'timestamp'
            }
        ],
        tableTemplate: 'groupedHeaders',
        headerGroups: [
            [
                { label: 'ID', rowspan: 2 },
                { label: 'Created At', rowspan: 2 },
                { label: 'Admin User ID', rowspan: 2 },
                { label: 'User ID', rowspan: 2 },
                { label: 'Status Code', rowspan: 2 },
                { label: 'Log Level', rowspan: 2 },
                { label: 'Short Description', rowspan: 2 },
                { label: 'Long Description', rowspan: 2 },
                { label: 'Debug Info', rowspan: 2 },
                { label: 'Count', rowspan: 2 }
            ]
        ],
        columns: [
          { key: 'id', label: 'ID', align: 'right' },
          { key: 'created_at', label: 'Created At', align: 'right', format: 'date_time' },
          { key: 'admin_user_id', label: 'Admin User ID', align: 'right' },
          { key: 'user_id', label: 'User ID', align: 'right' },
          { key: 'status_code', label: 'Status Code', align: 'right' },
          { key: 'log_level', label: 'Log Level', align: 'right' },
          { key: 'short_description', label: 'Short Description', align: 'right' },
          { key: 'long_description', label: 'Long Description', align: 'right' },
          { key: 'debug_info', label: 'Debug Info', align: 'right' },
          { key: 'count', label: 'Count', align: 'right' }
        ]
    };

    if(data.body.metadataRequest === true) {
        return reportUIConfig;
    }

    const INPUT_DATA = {
        id_filter_value: data.body.id || "",
        created_at_filter_value: data.body.created_at || "",
        admin_user_id_filter_value: data.body.admin_user_id || "",
        user_id_filter_value: data.body.user_id || "",
        status_code_filter_value: data.body.status_code || "",
        log_level_filter_value: data.body.log_level || "",
        short_description_filter_value: data.body.short_description || "",
        long_description_filter_value: data.body.long_description || "",
        debug_info_filter_value: data.body.debug_info || "",
        created_at_minimum_filter_value: data.body.created_at_min || "",
        created_at_maximum_filter_value: data.body.created_at_max || "",
    };

    const reportFilters = [
        {
            key: "id",
            grouping_expression: "L.id",
            filter_expression: "L.id = $FILTER_VALUE$",
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
            filter_expression: "STRPOS(LOWER(CAST( L.status_code AS text )), LOWER( $FILTER_VALUE$ )) > 0",
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
            grouping_expression: "DATE_TRUNC('day', L.created_at)",
            filter_expression: "L.created_at >= $FILTER_VALUE$",
            type: "timestamp",
        },
        {
            key: "created_at_maximum",
            grouping_expression: "DATE_TRUNC('day', L.created_at)",
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
        ORDER BY $id_grouping_expression$ DESC`;
    
    const replacedQueryData = this.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
    const result = await data.dbConnection.query(replacedQueryData.sql, replacedQueryData.insertValues);
    return { rows: result.rows, filters: reportFilters };
  }
  
  replaceFilterExpressions(sql, reportFilters, INPUT_DATA) {
    let insertValues = [];
    for (let reportFilter of reportFilters) {
        if ( ! reportFilter.grouping_expression) {
            sql = sql.replaceAll(`$${reportFilter.key}_grouping_expression$`, '');
        } else {
            sql = sql.replaceAll(`$${reportFilter.key}_grouping_expression$`, reportFilter.grouping_expression);
        }

        if (INPUT_DATA[`${reportFilter.key}_filter_value`]) {
            let filterExpr = reportFilter.filter_expression;
            let filterValue = INPUT_DATA[`${reportFilter.key}_filter_value`];
            let filterExprReplaced;
            insertValues.push(filterValue);

            // if (reportFilter.type === 'timestamp'){
            //     let [beginTimestampValue, endTimestampValue] = filterValue.split('|||');
            //     filterExprReplaced = filterExpr
            //         .replace('$FILTER_VALUE_START$', beginTimestampValue)
            //         .replace('$FILTER_VALUE_END$', endTimestampValue);
            // } else {
                filterExprReplaced = filterExpr.replace('$FILTER_VALUE$', `$${insertValues.length}`);
            // }

            sql = sql.replace(`$${reportFilter.key}_filter_expression$`, filterExprReplaced);
        } else {
            sql = sql.replace(`$${reportFilter.key}_filter_expression$`, 'TRUE');
        }
    }

    return {sql, insertValues};
  }
}

module.exports = ReportService;
