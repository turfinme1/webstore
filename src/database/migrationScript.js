const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const readline = require('readline');
const { ENV } = require('../serverConfigurations/constants');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
// const pool = require('./dbConfig');

const migrationsDir = path.join(__dirname, '../migrations');

class MigrationManager {
    constructor(enviroment, migrationDir) {
        this.enviroment = enviroment;
        this.migrationDir = migrationDir;
        this.pool = new Pool(enviroment.DB_CONFIG);
    }

    async initialize() {
        if(!fs.existsSync(this.migrationDir)) {
           await fs.promises.mkdir(this.migrationDir, { recursive: true });
        }

        const client = await this.pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                file_name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            );
        `);
    }

    async createMigrationFile(migrationName){
        const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
        const fileName = `${timestamp}_${migrationName}.sql`;
        const filePath = path.join(this.migrationDir, fileName);

        const template = `-- Migration: ${migrationName}\n-- Created at: ${new Date().toISOString()}`;

        await fs.promises.writeFile(filePath, template);
        console.log(`Created migration file: ${fileName}`);
        return fileName;
    }

    async applyMigrations() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const appliedMigrations = await client.query('SELECT file_name FROM migrations');
            const appliedFiles = new Set(appliedMigrations.rows.map(row => row.file_name));

            const migrationFiles = (await fs.promises.readdir(this.migrationDir)).filter(file => file.endsWith('.sql'));

            for (const file of migrationFiles) {
                if (!appliedFiles.has(file)) {
                    const filePath = path.join(this.migrationDir, file);
                    await this.executeMigrationFileInChunks(client, filePath);
                    await client.query('INSERT INTO migrations (file_name) VALUES ($1)', [file]);
                    console.log(`Applied migration: ${file}`);
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error running migrations:', error);
        } finally {
            client.release();
        }
    }

    async executeMigrationFileInChunks(client, filePath) {
        const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });
    
        let sqlChunk = '';
    
        for await (const line of rl) {
            sqlChunk += line + '\n';
            if (line.trim().endsWith(';')) {
                await client.query(sqlChunk);
                sqlChunk = '';
            }
        }
    
        if (sqlChunk.trim()) {
            await client.query(sqlChunk);
        }
    }
}

async function main() {
    const argv = yargs(hideBin(process.argv))
        .command(
            'create <name>',
            'Create a new migration',
            (yargs) => yargs.positional('name', { describe: 'Name of the migration', type: 'string' }),
        )
        .command(
            'apply [env]',
            'Apply all pending migrations',
            (yargs) => yargs.option('env', {
                describe: 'Environment',
                type: 'string',
                choices: ['development', 'qa', 'rc'],
                default: 'development',
            }),
        )
        .demandCommand(1, 'Please provide a valid command.')
        .strict()
        .help()
        .argv;

        console.log(argv);
    const enviroment = ENV[argv.env?.toUpperCase()] || ENV.DEVELOPMENT;
    const manager = new MigrationManager(enviroment, migrationsDir);

    try {
        await manager.initialize();
        if (argv._[0] === 'create') {
            await manager.createMigrationFile(argv.name);
        } else if (argv._[0] === 'apply') {
            await manager.applyMigrations();
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        // await manager.close();
        process.exit(0);
    }
}

main();