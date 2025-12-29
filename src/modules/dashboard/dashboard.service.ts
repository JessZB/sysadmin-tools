import { mainDbPool } from '../../shared/db/main.db';
import { getSqlServerConnection } from '../../shared/db/mssql.factory';
import { Terminal } from '../../shared/interfaces/terminal.interface';
import { RowDataPacket } from 'mysql2';
import sql from 'mssql';

// 1. Obtener lista simple de cajas para el sidebar
export const getActiveTerminals = async (branchId?: number) => {
    let query = 'SELECT id, name, ip_address, is_server, branch_id FROM pos_terminals WHERE is_active = 1';
    const params: any[] = [];

    // Si se pasa un ID, filtramos. Si es NULL (caso admin viendo todo), no filtramos.
    if (branchId) {
        query += ' AND branch_id = ?';
        params.push(branchId);
    }

    const [rows] = await mainDbPool.query<RowDataPacket[]>(query, params);
    return rows;
};

// 2. Obtener Jobs de una caja específica (Lógica mejorada de "En Ejecución")
export const getTerminalJobs = async (terminalId: number) => {
    // A. Buscar credenciales en MySQL
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT * FROM pos_terminals WHERE id = ?', [terminalId]);
    if (rows.length === 0) throw new Error('Terminal no encontrada');

    const terminal = rows[0] as Terminal;

    // B. Conectar a SQL Server
    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await getSqlServerConnection(terminal);

        // 0. Obtener Hora del Servidor SQL (Fuente de Verdad)
        const timeResult = await pool.request().query('SELECT GETDATE() as CurrentTime');
        const terminalTime = timeResult.recordset[0].CurrentTime;


        // C. Lógica Diferenciada
        if (terminal.is_server) {
            // --- LÓGICA PARA SERVIDORES (SP_HELP_JOB) ---

            // 1. Obtener lista de jobs y estado actual
            const jobsResult = await pool.request()
                .input('execution_status', sql.Int, null) // Null = Todos
                .execute('msdb.dbo.sp_help_job');

            const allJobs = jobsResult.recordset;
            const enabledJobs = allJobs.filter((j: any) => j.enabled === 1 && j.name !== 'syspolicy_purge_history');

            const mappedJobs = [];

            // 2. Iterar para obtener historial (mensaje) y formatear
            for (const job of enabledJobs) {
                let lastMessage = '';
                let durationFormatted = '00:00:00';

                // Obtener historial reciente para el mensaje
                try {
                    const historyResult = await pool.request()
                        .input('job_id', sql.UniqueIdentifier, job.job_id)
                        .input('mode', sql.VarChar, 'FULL')
                        .execute('msdb.dbo.sp_help_jobhistory');

                    if (historyResult.recordset.length > 0) {
                        const lastHistory = historyResult.recordset[0];
                        lastMessage = lastHistory.message;

                        // Obtener duración real del historial
                        if (lastHistory.run_duration > 0) {
                            const durStr = lastHistory.run_duration.toString().padStart(6, '0');
                            // SQL Server duration is HHMMSS as int, e.g. 10230 = 1:02:30
                            const hrs = durStr.substring(0, 2);
                            const min = durStr.substring(2, 4);
                            const sec = durStr.substring(4, 6);
                            durationFormatted = `${hrs}:${min}:${sec}`;
                        }
                    }
                } catch (e) { console.error(`Error fetching history for job ${job.name}`, e); }

                // 1. Execution Status
                let executionStatus = 'Idle';
                if (job.current_execution_status === 1) executionStatus = 'Running';

                // 2. Last Outcome
                let lastOutcome = 'Desconocido';
                if (job.last_run_outcome === 1) lastOutcome = 'Exitoso';
                else if (job.last_run_outcome === 0) lastOutcome = 'Fallido';
                else if (job.last_run_outcome === 3) lastOutcome = 'Cancelado';



                // 4. Last Run Date
                let lastRunDate = null;
                if (job.last_run_date > 0) {
                    const dStr = job.last_run_date.toString();
                    const tStr = job.last_run_time.toString().padStart(6, '0');

                    const year = parseInt(dStr.substring(0, 4));
                    const month = parseInt(dStr.substring(4, 6)) - 1; // JS months are 0-indexed
                    const day = parseInt(dStr.substring(6, 8));

                    const hour = parseInt(tStr.substring(0, 2));
                    const min = parseInt(tStr.substring(2, 4));
                    const sec = parseInt(tStr.substring(4, 6));

                    lastRunDate = new Date(year, month, day, hour, min, sec);
                }

                mappedJobs.push({
                    JobName: job.name,
                    ExecutionStatus: executionStatus,
                    LastOutcome: lastOutcome,
                    LastDuration: durationFormatted,
                    LastRunDate: lastRunDate,
                    LastMessage: lastMessage
                });
            }

            return { jobs: mappedJobs, terminalTime };

        } else {
            // --- LÓGICA HÍBRIDA (TRY/CATCH) ---

            // 1. Definimos la Query COMPLETA (La que te gusta, con historial)
            const queryFull = `
                SELECT 
                    j.name AS JobName,
                    CASE 
                        WHEN ja.start_execution_date IS NOT NULL AND ja.stop_execution_date IS NULL THEN 'Running'
                        ELSE 'Idle'
                    END AS ExecutionStatus,
                    CASE 
                        WHEN h.run_status = 1 THEN 'Exitoso'
                        WHEN h.run_status = 0 THEN 'Fallido'
                        WHEN h.run_status = 2 THEN 'Reintentar'
                        WHEN h.run_status = 3 THEN 'Cancelado'
                        ELSE 'Desconocido' 
                    END AS LastOutcome,
                    CASE
                        WHEN ja.start_execution_date IS NOT NULL AND ja.stop_execution_date IS NULL THEN ja.start_execution_date
                        ELSE msdb.dbo.agent_datetime(h.run_date, h.run_time) 
                    END AS LastRunDate,
                    STUFF(STUFF(RIGHT('000000' + CAST(h.run_duration AS VARCHAR(6)), 6), 3, 0, ':'), 6, 0, ':') AS LastDuration,
                    h.message AS LastMessage
                FROM msdb.dbo.sysjobs j
                LEFT JOIN msdb.dbo.sysjobactivity ja 
                    ON j.job_id = ja.job_id
                    AND ja.session_id = (SELECT TOP 1 session_id FROM msdb.dbo.syssessions ORDER BY session_id DESC)
                OUTER APPLY (
                    SELECT TOP 1 run_status, run_date, run_time, run_duration, message
                    FROM msdb.dbo.sysjobhistory jh
                    WHERE jh.job_id = j.job_id
                    ORDER BY run_date DESC, run_time DESC
                ) h
                WHERE j.enabled = 1 AND j.name != 'syspolicy_purge_history'
            `;

            try {
                // INTENTO A: Ejecutar Query Completa (Para Cajas con permisos)
                const result = await pool.request().query(queryFull);
                return { jobs: result.recordset, terminalTime };

            } catch (error: any) {
                // Si el error es de permisos (SELECT permission denied), usamos el Plan B
                if (error.message && (error.message.includes('permission was denied') || error.message.includes('sysjobhistory'))) {
                    console.warn(`Permisos restringidos en terminal ${terminalId}, usando modo seguro.`);

                    // INTENTO B: Query Segura (Sin sysjobhistory, para el Servidor restringido)
                    const querySafe = `
                        SELECT 
                            j.name AS JobName,
                            CASE 
                                WHEN ja.start_execution_date IS NOT NULL AND ja.stop_execution_date IS NULL THEN 'Running'
                                ELSE 'Idle'
                            END AS ExecutionStatus,
                            CASE 
                                WHEN ja.start_execution_date IS NOT NULL AND ja.stop_execution_date IS NULL THEN 'En Ejecución'
                                ELSE 'Desconocido (Sin Permisos)' 
                            END AS LastOutcome,
                            ja.start_execution_date AS LastRunDate,
                            NULL AS LastDuration,
                            'Requiere permisos de lectura en sysjobhistory' AS LastMessage
                        FROM msdb.dbo.sysjobs j
                        LEFT JOIN msdb.dbo.sysjobactivity ja 
                            ON j.job_id = ja.job_id
                            AND ja.session_id = (SELECT TOP 1 session_id FROM msdb.dbo.syssessions ORDER BY session_id DESC)
                        WHERE j.enabled = 1 AND j.name != 'syspolicy_purge_history'
                    `;

                    const resultSafe = await pool.request().query(querySafe);
                    return { jobs: resultSafe.recordset, terminalTime };
                } else {
                    // Si es otro error (conexión, etc), lo lanzamos hacia arriba
                    throw error;
                }
            }
        }

    } finally {
        if (pool) await pool.close();
    }
};

// 3. Ejecutar Job
export const executeJob = async (terminalId: number, jobName: string) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT * FROM pos_terminals WHERE id = ?', [terminalId]);
    const terminal = rows[0] as Terminal;

    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await getSqlServerConnection(terminal);
        await pool.request()
            .input('job_name', sql.VarChar, jobName)
            .execute('msdb.dbo.sp_start_job');
        return true;
    } finally {
        if (pool) await pool.close();
    }
};

// 4. Detener Job
export const stopJob = async (terminalId: number, jobName: string) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT * FROM pos_terminals WHERE id = ?', [terminalId]);
    const terminal = rows[0] as Terminal;

    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await getSqlServerConnection(terminal);
        await pool.request()
            .input('job_name', sql.VarChar, jobName)
            .execute('msdb.dbo.sp_stop_job');
        return true;
    } finally {
        if (pool) await pool.close();
    }
};

// 5. Obtener Historial de un Job específico
export const getJobHistory = async (terminalId: number, jobName: string) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT * FROM pos_terminals WHERE id = ?', [terminalId]);
    const terminal = rows[0] as Terminal;

    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await getSqlServerConnection(terminal);

        // Traemos los últimos 15 registros
        const query = `
            SELECT TOP 15
                h.run_status,
                CASE 
                    WHEN h.run_status = 1 THEN 'Exitoso'
                    WHEN h.run_status = 0 THEN 'Fallido'
                    WHEN h.run_status = 2 THEN 'Reintentar'
                    WHEN h.run_status = 3 THEN 'Cancelado'
                    ELSE 'En curso' 
                END AS StatusText,
                msdb.dbo.agent_datetime(h.run_date, h.run_time) as RunDate,
                STUFF(STUFF(RIGHT('000000' + CAST(h.run_duration AS VARCHAR(6)), 6), 3, 0, ':'), 6, 0, ':') AS Duration,
                h.message
            FROM msdb.dbo.sysjobhistory h
            JOIN msdb.dbo.sysjobs j ON j.job_id = h.job_id
            WHERE j.name = @jobName AND h.step_id = 0 -- step_id 0 es el resultado global del job
            ORDER BY h.run_date DESC, h.run_time DESC
        `;

        const result = await pool.request()
            .input('jobName', sql.VarChar, jobName)
            .query(query);

        return result.recordset;
    } finally {
        if (pool) await pool.close();
    }
};

