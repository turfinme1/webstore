// src/services/reportService.js
class ReportService {
    constructor() {
        
    }

    async getOrdersByUserReport(data) {
        const { body, dbConnection } = data;
        const INPUT_DATA = {
            "user_name_filter_value": body.user_name || '',
            "user_id_filter_value": body.user_id || '',
            "order_total_filter_value_min": body.order_total_min || '0',
            "order_total_filter_value_max": body.order_total_max || '9999999',
        };

        const reportFilters = [
            {
                key: "user_name",
                grouping_expression: "U.email",
                filter_expression: "U.email ILIKE '%' || $FILTER_VALUE$ || '%'",
                type: "text"
            },
            {
                key: "user_id",
                grouping_expression: "U.id",
                filter_expression: "U.id = $FILTER_VALUE$",
                type: "number"
            },
            {
                key: "order_total",
                grouping_expression: "NULL",
                filter_expression: "O.total_price BETWEEN $FILTER_VALUE_MIN$ AND $FILTER_VALUE_MAX$",
                type: "range_number"
            }
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
                AND $order_total_filter_expression$
            GROUP BY $user_name_grouping_expression$, $user_id_grouping_expression$
            ORDER BY $user_name_grouping_expression$ ASC
        `;

        for (let reportFilter of reportFilters) {
            // Handle grouping expression
            if (reportFilter.grouping_expression === 'NULL') {
                sql = sql.replace(new RegExp(`\\$${reportFilter.key}_grouping_expression\\$`, 'g'), 'NULL');
            } else {
                sql = sql.replace(new RegExp(`\\$${reportFilter.key}_grouping_expression\\$`, 'g'), reportFilter.grouping_expression);
            }

            // Handle filter expression
            if (reportFilter.type === 'range_number') {
                let min = INPUT_DATA[`${reportFilter.key}_filter_value_min`] || '0';
                let max = INPUT_DATA[`${reportFilter.key}_filter_value_max`] || '9999999';
                let filterExprReplaced = reportFilter.filter_expression
                    .replace('$FILTER_VALUE_MIN$', min)
                    .replace('$FILTER_VALUE_MAX$', max);
                sql = sql.replace(new RegExp(`\\$${reportFilter.key}_filter_expression\\$`, 'g'), filterExprReplaced);
            } else if (INPUT_DATA[`${reportFilter.key}_filter_value`]) {
                let filterValue = INPUT_DATA[`${reportFilter.key}_filter_value`];
                let filterExprReplaced = reportFilter.filter_expression.replace('$FILTER_VALUE$', filterValue);
                sql = sql.replace(new RegExp(`\\$${reportFilter.key}_filter_expression\\$`, 'g'), filterExprReplaced);
            } else {
                sql = sql.replace(new RegExp(`\\$${reportFilter.key}_filter_expression\\$`, 'g'), 'TRUE');
            }
        }

        const result = await dbConnection.query(sql);
        return result.rows;
    }
}

module.exports = ReportService;