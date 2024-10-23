const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

class ExportService {
    constructor(crudService) {
        this.crudService = crudService;
        this.exportToCsv = this.exportToCsv.bind(this);
    }

    async exportToCsv(data) {
        const { query, aggregatedTotalQuery, searchValues } = this.crudService.buildFilteredPaginatedQuery(data);

        const csvStream = Readable.from(this.generateCsvRows({ ...data, query, aggregatedTotalQuery, searchValues }));
        
        data.res.writeHead(200, {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=${data.params.entity}.csv`,
        });

        await pipeline(csvStream, data.res);
    }

    async executeQueryWithCursor(data){
        await data.dbConnection.query(`DECLARE export_cursor CURSOR FOR ${data.query}`);

        async function* fetchRows() {
            let result = await data.dbConnection.query("FETCH 1000 FROM export_cursor");
            while (result.rows.length > 0) {
                yield result.rows;
                result = await data.dbConnection.query("FETCH 1000 FROM export_cursor");
            }

            await data.dbConnection.query("CLOSE export_cursor");
        }

        return fetchRows();
    }
    
    async* generateCsvRows(data) {
        const rowGenerator = await this.executeQueryWithCursor(data);
        const headers = Object.keys(rowGenerator[0]).join(",") + "\n";

        yield headers;
        for await (const row of rowGenerator) {
            let rowValues = Object.values(row).join(",") + "\n";
            yield rowValues;
        }
    }
}

module.exports = ExportService;