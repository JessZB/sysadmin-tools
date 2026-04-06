import { mainDbPool } from '../../shared/db/main.db';
import { RowDataPacket } from 'mysql2';

// 1. REGISTRAR UN EVENTO (Esta es la función que usarás en todos lados)
export const logAction = async (
    userId: number,
    branchId: number,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXECUTE' | 'STOP',
    entity: 'TERMINAL' | 'USER' | 'BRANCH' | 'JOB' | 'MODULE' | 'CATEGORY',
    entityId: number | null,
    details: string,
    ip: string = '::1'
) => {
    try {
        await mainDbPool.query(
            `INSERT INTO sys_audit_logs 
            (user_id, branch_id, action, entity, entity_id, details, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, branchId, action, entity, entityId, details, ip]
        );
    } catch (error) {
        // Importante: Si falla el log, no deberíamos detener la aplicación, 
        // pero sí mostrarlo en consola.
        console.error('Error escribiendo auditoría:', error);
    }
};

// 2. OBTENER EL TIMELINE (Para la vista)
export const getAuditTimeline = async (limit = 50, branchId?: number) => {
    let query = `
        SELECT 
            l.*, 
            u.username, 
            u.role,
            b.name as branch_name
        FROM sys_audit_logs l
        JOIN sys_users u ON l.user_id = u.id
        LEFT JOIN sys_branches b ON l.branch_id = b.id
        WHERE 1=1
    `;

    const params: any[] = [];

    // Si pasamos branchId, filtramos (para que Analistas vean solo su sucursal)
    if (branchId) {
        query += ' AND l.branch_id = ?';
        params.push(branchId);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await mainDbPool.query<RowDataPacket[]>(query, params);
    return rows;
};