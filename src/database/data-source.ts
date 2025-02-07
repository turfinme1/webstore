import "reflect-metadata"
import { DataSource } from "typeorm"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "webstore",
    synchronize: false,
    logging: false,
    entities: [
     "src/database/entity/**/*.ts"
    ],
    migrations: ["src/database/migration/**/*.ts"], 
    subscribers: [],
})