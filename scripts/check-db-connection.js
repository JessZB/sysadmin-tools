require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    console.log('--- Checking Database Connection ---');
    console.log(`Host: ${process.env.MYSQL_HOST}`);
    console.log(`User: ${process.env.MYSQL_USER}`);
    console.log(`Target DB: ${process.env.MYSQL_DB_NAME}`);

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
        });
        console.log('✅ Connected to MySQL Server successfully.');

        const dbName = process.env.MYSQL_DB_NAME;
        const [rows] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);
        
        if (rows.length > 0) {
            console.log(`✅ Database '${dbName}' exists.`);
        } else {
            console.error(`❌ Database '${dbName}' DOES NOT EXIST.`);
            console.log(`   Please create it or update MYSQL_DB_NAME in .env`);
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
    }
}

check();
