class ReportService {
  constructor() {}

  async getOrdersByUserReport(data) {
    const INPUT_DATA = {
      user_name_filter_value: data.body.user_name || "",
      user_id_filter_value: data.body.user_id || "",
      order_total_minimum_filter_value: data.body.order_total_min || "0",
      order_total_maximum_filter_value: data.body.order_total_max || "9999999",
    };
    let insertValues = [];

    const reportFilters = [
        {
            key: "user_name",
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
            grouping_expression: "NULL",
            filter_expression: "O.total_price >= $FILTER_VALUE$",
            type: "number",
        },
        {
            key: "order_total_maximum",
            grouping_expression: "NULL",
            filter_expression: "O.total_price <= $FILTER_VALUE$",
            type: "number",
        },
    ];

    let sql = `
        SELECT
            $user_name_grouping_expression$ AS "user_name",
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
            AND $user_name_filter_expression$
            AND $user_id_filter_expression$
            AND $order_total_minimum_filter_expression$
            AND $order_total_maximum_filter_expression$
        GROUP BY GROUPING SETS (
            (1, 2),
            ()
        )
        ORDER BY $user_name_grouping_expression$ ASC`;

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

            if (reportFilter.type === 'timestamp'){
                let [beginTimestampValue, endTimestampValue] = filterValue.split('|||');
                filterExprReplaced = filterExpr
                    .replace('$FILTER_VALUE_START$', beginTimestampValue)
                    .replace('$FILTER_VALUE_END$', endTimestampValue);
            } else {
                filterExprReplaced = filterExpr.replace('$FILTER_VALUE$', `$${insertValues.length}`);
            }

            sql = sql.replace(`$${reportFilter.key}_filter_expression$`, filterExprReplaced);
        } else {
            sql = sql.replace(`$${reportFilter.key}_filter_expression$`, 'TRUE');
        }
    }

    const result = await data.dbConnection.query(sql, insertValues);
    return result.rows;
  }
}

module.exports = ReportService;
