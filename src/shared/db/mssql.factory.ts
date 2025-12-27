import sql from 'mssql';
import { Terminal } from '../interfaces/terminal.interface';
import { decrypt } from '../utils/crypto.util';

export const getSqlServerConnection = async (terminal: Terminal) => {
    const config: sql.config = {
        user: terminal.db_user,
        password: decrypt(terminal.db_pass),
        server: terminal.ip_address,
        database: 'msdb', // Siempre msdb para ver jobs
        options: {
            encrypt: false, // Generalmente false en redes locales
            trustServerCertificate: true,
            enableArithAbort: true
        },
        connectionTimeout: 5000 // 5 segundos máximo para conectar
    };

    try {
        const pool = await new sql.ConnectionPool(config).connect();
        return pool;
    } catch (error) {
        throw new Error(`No se pudo conectar a ${terminal.ip_address}`);
    }
};