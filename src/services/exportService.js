class ExportService {
    constructor() {
        this.exportToCsv = this.exportToCsv.bind(this);
        this.exportToExcel = this.exportToExcel.bind(this);
    }

    async exportToCsv(data) {
        data.res.writeHead(200, {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=${data.params.entity}.csv`,
        });
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