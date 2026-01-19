require('dotenv').config();
const mysql = require('mysql2/promise');

async function updatePassword() {
    console.log('--- Updating Admin Password ---');
    
    // Hash generado para '123456'
    const newHash = '$2b$10$laNnOFwMB7siSQZwB//1Beio88sazrtSN3O8/KMdV3xA.SRVVJG6G';
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DB_NAME
        });

        console.log(`Connected to ${process.env.MYSQL_DB_NAME}`);

        const [result] = await connection.execute(
            'UPDATE sys_users SET password_hash = ? WHERE username = ?',
            [newHash, 'admin']
        );

        console.log('Update Result:', result);
        
        if (result.affectedRows > 0) {
            console.log('✅ Admin password updated successfully to "123456"');
        } else {
            console.log('⚠️ No user named "admin" found. Creating one...');
            // Optional: Create if not exists
             await connection.execute(
                `INSERT INTO sys_users (username, password_hash, role, branch_id, is_active) VALUES 
                ('admin', ?, 'admin', 1, 1)`,
                [newHash]
            );
            console.log('✅ Admin user created.');
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

updatePassword();
