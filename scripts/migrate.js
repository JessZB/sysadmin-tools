import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB_NAME,
});

async function runMigration() {
    try {
        console.log('Running migrations...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`sys_module_categories\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`name\` varchar(50) NOT NULL,
                \`description\` varchar(255) DEFAULT NULL,
                \`icon\` varchar(50) DEFAULT 'fa-folder',
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('- Table sys_module_categories created or already exists.');

        await pool.query(`
            INSERT IGNORE INTO \`sys_module_categories\` (\`id\`, \`name\`, \`description\`) 
            VALUES (1, 'Sin Categoría', 'Módulos descubiertos automáticamente que no han sido agrupados.');
        `);
        console.log('- Default category created.');

        try {
            await pool.query(`ALTER TABLE \`sys_modules\` ADD COLUMN \`category_id\` int(11) DEFAULT 1;`);
            console.log('- Added column category_id to sys_modules');
        } catch(e) { console.log('- Column category_id already exists or error: ', e.message); }

        try {
            await pool.query(`ALTER TABLE \`sys_modules\` ADD COLUMN \`is_configured\` tinyint(1) DEFAULT 1;`);
            console.log('- Added column is_configured to sys_modules');
        } catch(e) { console.log('- Column is_configured already exists or error: ', e.message); }

        try {
            await pool.query(`ALTER TABLE \`sys_modules\` ADD CONSTRAINT \`fk_module_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`sys_module_categories\`(\`id\`) ON DELETE SET NULL;`);
            console.log('- Added constraint fk_module_category');
        } catch(e) { console.log('- Constraint fk_module_category already exists or error: ', e.message); }

        console.log('Migrations completed successfully.');
    } catch(err) {
        console.error('Fatal error running migrations: ', err);
    } finally {
        await pool.end();
    }
}

runMigration();
