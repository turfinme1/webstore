const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

class ExportService {
    constructor(crudService) {
        this.crudService = crudService;
        this.exportToCsv = this.exportToCsv.bind(this);
    }

    async exportToCsv(data) {
        const parameters = this.crudService.buildFilteredPaginatedQuery(data);
        const dataParams = {
            ...data,
            query: parameters.query,
            aggregatedTotalQuery: parameters.aggregatedTotalQuery,
            searchValues: parameters.searchValues,
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
            let result = await data.dbConnection.query("FETCH 2000 FROM export_cursor");
            while (result.rows.length > 0) {
                yield result.rows;
                result = await data.dbConnection.query("FETCH 2000 FROM export_cursor");
            }

            await data.dbConnection.query("CLOSE export_cursor");
        }

        return fetchRows();
    }
    
    async* generateCsvRows(data) {
        const rowGenerator = await this.executeQueryWithCursor(data);
        let headersWritten = false;
        yield "\uFEFF";
        for await (const rows of rowGenerator) {
            for (const row of rows) {
                if (!headersWritten) {
                    const headers = Object.keys(row)
                    .filter(key => this.isPrimitive(row[key]))
                    .join(",") + "\n";
                    yield headers;
                    headersWritten = true;
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