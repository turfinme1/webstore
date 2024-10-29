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
        for (const [key, value] of Object.entries(parameters.appliedFilters)) {
            worksheet.addRow([`${key}:`, JSON.stringify(value)]).commit();
        }
        worksheet.addRow(['Grouping Applied:']).commit(); 
        for (const [key, value] of Object.entries(parameters.appliedGroups)) {
            worksheet.addRow([`${key}:`, value]).commit();
        }

        worksheet.addRow([]).commit();

        const rowGenerator = await this.executeQueryWithCursor(dataParams);

        let headers = null;
        for await (const rows of rowGenerator) {
            for (const row of rows) {
                if (!headers) {
                    headers = Object.keys(row).filter(key => this.isPrimitive(row[key]));
                    worksheet.addRow(headers).commit();
                }

                const rowValues = headers.map(header => row[header]);
                worksheet.addRow(rowValues).commit();
            }
        }

        const totalsResult = await data.dbConnection.query(dataParams.aggregatedTotalQuery, dataParams.searchValues);
        const totalsRow = totalsResult.rows[0]; 

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
        const rowGenerator = await this.executeQueryWithCursor(data);
        let headers = null;
        yield "\uFEFF";
      
        yield "Filters Applied:\n";
        for (const [key, value] of Object.entries(data.appliedFilters)) {
            const sanitizedValue = JSON.stringify(value).replace(/[:",]/g, ' ');  
            yield `${key}:,${sanitizedValue}\n`;
        }
        yield "\n";

        yield "Groups Applied:\n";
        for (const [key, value] of Object.entries(data.appliedGroups)) {
            yield `${key}:,${value}\n`;
        }
        yield "\n";

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

        const totalsResult = await data.dbConnection.query(data.aggregatedTotalQuery, data.searchValues);
        const totalsRow = totalsResult.rows[0];
        const footerRow = headers.map(header => {
            const totalKey = `total_${header}`;
            return totalsRow[totalKey] || '';  
        });

        footerRow[0] = `Total ${totalsRow?.total_rows || 0} rows`;
        yield footerRow.join(",") + "\n";
    }

    isPrimitive(value) {
        return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date || value === null);
    }
}

module.exports = ExportService;