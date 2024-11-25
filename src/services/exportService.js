const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const ExcelJS = require("exceljs");

class ExportService {
    constructor(crudService) {
        this.crudService = crudService;
        this.exportToExcel = this.exportToExcel.bind(this);
        this.exportToCsv = this.exportToCsv.bind(this);
    }

    async exportToExcel(data) {
        let totalPrice = 0;
        let discountAmount = 0;
        let totalPriceAfterDiscount = 0;
        let vatAmount = 0; 
        let totalPriceWithVAT = 0;
        let paidAmount = 0;

        const parameters = this.crudService.buildFilteredPaginatedQuery(data, true);
        const dataParams = {
            ...data,
            query: parameters.query,
            aggregatedTotalQuery: parameters.aggregatedTotalQuery,
            searchValues: parameters.searchValues,
        }

        data.res.writeHead(200, {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=${data.params.entity}.xlsx`,
        });

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: data.res, useSharedStrings: true, useStyles: true });

        const worksheet = workbook.addWorksheet(data.params.entity);

        worksheet.addRow(['Filters Applied:']).commit();
        worksheet.addRow(['Field', 'Criteria']).commit();
        for (const [key, value] of Object.entries(parameters.appliedFilters)) {
            if (typeof value === 'object') {
                worksheet.addRow([`${key}`, `${value.min || "-"} - ${value.max || "-"}`]).commit();
            } else if (typeof value === 'string') {
                worksheet.addRow([`${key}`, value]).commit();
            }
        }
        worksheet.addRow(['Grouping Applied:']).commit(); 
        for (const [key, value] of Object.entries(parameters.appliedGroups)) {
            worksheet.addRow([`${value}`]).commit();
        }

        worksheet.addRow([]).commit();

        const rowGenerator = await this.executeQueryWithCursor(dataParams);

        let headers = [];
        for await (const rows of rowGenerator) {
            for (const row of rows) {
                if ( ! headers.length) {
                    headers = Object.keys(row).filter(key => this.isPrimitive(row[key]));

                    worksheet.addRow(headers).commit();
                }
                totalPrice += parseFloat(row.total_price);
                totalPriceWithVAT += parseFloat(row.total_price_with_vat);
                discountAmount += parseFloat(row.discount_amount);
                totalPriceAfterDiscount += parseFloat(row.total_price_after_discount);
                vatAmount += parseFloat(row.vat_amount);
                if(row.paid_amount){
                    paidAmount += parseFloat(row.paid_amount);
                }
                let rowValues = headers.map(header => row[header]);
                
                worksheet.addRow(rowValues).commit();
            }
        }

        const totalsResult = await data.dbConnection.query(dataParams.aggregatedTotalQuery, dataParams.searchValues);
        const totalsRow = totalsResult.rows[0];
        totalsRow.total_total_price = totalPrice.toFixed(2);
        totalsRow.total_discount_amount = discountAmount.toFixed(2);
        totalsRow.total_total_price_after_discount = totalPriceAfterDiscount.toFixed(2);
        totalsRow.total_vat_amount = vatAmount.toFixed(2);
        totalsRow.total_total_price_with_vat = totalPriceWithVAT.toFixed(2); 
        totalsRow.total_paid_amount = paidAmount.toFixed(2);

        const footerRow = headers.map(header => {
            const totalKey = `total_${header}`;
            return totalsRow[totalKey] || '';  
        });

        footerRow[0] = `Total ${totalsRow?.total_rows || 0} rows`;  
        worksheet.addRow(footerRow).commit();

        worksheet.commit();
        await workbook.commit();
    }

    async exportToCsv(data) {
        const parameters = this.crudService.buildFilteredPaginatedQuery(data, true);
        const dataParams = {
            ...data,
            query: parameters.query,
            aggregatedTotalQuery: parameters.aggregatedTotalQuery,
            searchValues: parameters.searchValues,
            appliedFilters: parameters.appliedFilters,
            appliedGroups: parameters.appliedGroups,
        }
        const csvStream = Readable.from(this.generateCsvRows(dataParams));

        data.res.writeHead(200, {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=${data.params.entity}.csv`,
        });
        await pipeline(csvStream, data.res);
    }

    async executeQueryWithCursor(data){
        await data.dbConnection.query(`DECLARE export_cursor CURSOR FOR ${data.query}`, data.searchValues);

        async function* fetchRows() {
            let result = await data.dbConnection.query("FETCH 10000 FROM export_cursor");
            while (result.rows.length > 0) {
                yield result.rows;
                result = await data.dbConnection.query("FETCH 10000 FROM export_cursor");
            }

            await data.dbConnection.query("CLOSE export_cursor");
        }

        return fetchRows();
    }
    
    async* generateCsvRows(data) {
        if(data.params.entity === 'target-groups'){
            yield* this.generateTargetGroupRows(data);
            return;
        }

        const rowGenerator = await this.executeQueryWithCursor(data);
        let totalPrice = 0;
        let discountAmount = 0;
        let totalPriceAfterDiscount = 0;
        let vatAmount = 0; 
        let totalPriceWithVAT = 0;
        let paidAmount = 0;

        let headers = null;
        yield "\uFEFF";
      
        yield "Filters Applied:\n";
        yield "Field,Criteria\n";
        for (const [key, value] of Object.entries(data.appliedFilters)) {
            if (typeof value === 'object') {
                yield `${key},${value.min || "-"} - ${value.max || "-"}\n`;
            }
            else if (typeof value === 'string') {
                yield `${key},${value}\n`;
            }
        }
        yield "\n";

        yield "Groups Applied:\n";
        for (const [key, value] of Object.entries(data.appliedGroups)) {
            yield `${value}\n`;
        }
        yield "\n";

        for await (const rows of rowGenerator) {
            for (const row of rows) {
                if (!headers) {
                    headers = Object.keys(row).filter(key => this.isPrimitive(row[key]));

                    yield `${headers.join(",")}\n`;
                }

                totalPrice += parseFloat(row.total_price);
                discountAmount += parseFloat(row.discount_amount);
                totalPriceAfterDiscount += parseFloat(row.total_price_after_discount);
                vatAmount += parseFloat(row.vat_amount);
                if(row.paid_amount){
                    paidAmount += parseFloat(row.paid_amount);
                }
                totalPriceWithVAT += parseFloat(row.total_price_with_vat);

                const rowValues = Object.values(row)
                .filter(value => this.isPrimitive(value))
                .map(value => {
                    if (Array.isArray(value)) {
                        return value.join(':');
                    }
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value);
                    }

                    return value;
                })
                .join(",") + "\n";

                yield rowValues;
            }
        }

        const totalsResult = await data.dbConnection.query(data.aggregatedTotalQuery, data.searchValues);
        let totalsRow = totalsResult.rows[0];
        totalsRow.total_total_price = totalPrice.toFixed(2);
        totalsRow.total_discount_amount = discountAmount.toFixed(2);
        totalsRow.total_total_price_after_discount = totalPriceAfterDiscount.toFixed(2);
        totalsRow.total_vat_amount = vatAmount.toFixed(2);
        totalsRow.total_total_price_with_vat = totalPriceWithVAT.toFixed(2);
        totalsRow.total_paid_amount = paidAmount.toFixed(2);

        const footerRow = headers.map(header => {
            const totalKey = `total_${header}`;
            return totalsRow[totalKey] || '';  
        });

        footerRow[0] = `Total ${totalsRow?.total_rows || 0} rows`;
        yield footerRow.join(",") + "\n";
    }


    async* generateTargetGroupRows(data) {
        const rowGenerator = await this.executeQueryWithCursor(data);
        let headers = null;

        yield "\uFEFF";

        for await (const rows of rowGenerator) {
            for (const row of rows) {
                if (!headers) {
                    headers = Object.keys(row).filter(key => this.isPrimitive(row[key]));

                    yield `${headers.join(",")}\n`;
                }
                

                const rowValues = Object.values(row)
                .filter(value => this.isPrimitive(value))
                .map(value => {
                    if (Array.isArray(value)) {
                        return value.join(':');
                    }
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value);
                    }

                    return value;
                })
                .join(",") + "\n";

                yield rowValues;
            }
        }

    }

    isPrimitive(value) {
        return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date || value === null);
    }
}

module.exports = ExportService;