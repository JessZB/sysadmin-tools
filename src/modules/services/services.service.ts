import { mainDbPool } from '../../shared/db/main.db';
import { Service, ServiceCheck } from '../../shared/interfaces/service.interface';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { executePing } from './ping.service';

/**
 * Obtiene todos los servicios con su último estado de verificación
 */
export const getAllServices = async () => {
    const query = `
        SELECT s.*, u.username as creator_name,
               sc.is_alive as last_status,
               sc.response_time as last_response_time,
               sc.packet_loss as last_packet_loss,
               sc.checked_at as last_checked_at
        FROM sys_services s
        LEFT JOIN sys_users u ON s.created_by = u.id
        LEFT JOIN (
            SELECT service_id, is_alive, response_time, packet_loss, checked_at
            FROM sys_service_checks
            WHERE (service_id, checked_at) IN (
                SELECT service_id, MAX(checked_at)
                FROM sys_service_checks
                GROUP BY service_id
            )
        ) sc ON s.id = sc.service_id
        ORDER BY s.name ASC
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query);
    return rows;
};

/**
 * Crea un nuevo servicio
 */
export const createService = async (data: Partial<Service>, createdBy: number) => {
    const [result] = await mainDbPool.query<ResultSetHeader>(
        'INSERT INTO sys_services (name, host, type, category, description, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [data.name, data.host, data.type, data.category || 'servicios', data.description, createdBy]
    );
    return result.insertId;
};

/**
 * Actualiza un servicio existente
 */
export const updateService = async (id: number, data: Partial<Service>, updatedBy: number) => {
    await mainDbPool.query(
        'UPDATE sys_services SET name=?, host=?, type=?, category=?, description=?, updated_by=?, is_active=? WHERE id=?',
        [data.name, data.host, data.type, data.category || 'servicios', data.description, updatedBy, data.is_active, id]
    );
};

/**
 * Elimina un servicio (y su historial por CASCADE)
 */
export const deleteService = async (id: number) => {
    await mainDbPool.query('DELETE FROM sys_services WHERE id = ?', [id]);
};

/**
 * Ejecuta ping a un servicio y guarda el resultado
 */
export const pingServiceAndSave = async (serviceId: number) => {
    // Obtener servicio
    const [services] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT * FROM sys_services WHERE id = ?',
        [serviceId]
    );

    if (services.length === 0) {
        throw new Error('Servicio no encontrado');
    }

    const service = services[0] as Service;

    // Ejecutar ping
    const pingResult = await executePing(service.host);

    // Guardar resultado en historial
    await mainDbPool.query(
        `INSERT INTO sys_service_checks 
         (service_id, is_alive, response_time, packet_loss, min_time, max_time, avg_time, error_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            serviceId,
            pingResult.alive,
            pingResult.avg,
            pingResult.packetLoss,
            pingResult.min,
            pingResult.max,
            pingResult.avg,
            pingResult.alive ? null : 'Host unreachable'
        ]
    );

    return pingResult;
};

/**
 * Obtiene el historial de verificaciones de un servicio
 */
export const getServiceHistory = async (serviceId: number, limit: number = 50) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT * FROM sys_service_checks 
         WHERE service_id = ? 
         ORDER BY checked_at DESC 
         LIMIT ?`,
        [serviceId, limit]
    );
    return rows;
};

/**
 * Obtiene servicios filtrados por categoría
 */
export const getServicesByCategory = async (category: string, branchId?: number) => {
    let query = `
        SELECT s.*, b.name as branch_name,
               sc.is_alive as last_status,
               sc.response_time as last_response_time,
               sc.packet_loss as last_packet_loss,
               sc.checked_at as last_checked_at
        FROM sys_services s
        LEFT JOIN pos_terminals t ON s.terminal_id = t.id
        LEFT JOIN sys_branches b ON t.branch_id = b.id
        LEFT JOIN (
            SELECT service_id, is_alive, response_time, packet_loss, checked_at
            FROM sys_service_checks
            WHERE (service_id, checked_at) IN (
                SELECT service_id, MAX(checked_at)
                FROM sys_service_checks
                GROUP BY service_id
            )
        ) sc ON s.id = sc.service_id
        WHERE s.category = ?
    `;

    const params: any[] = [category];

    // Si es categoría terminales y se especifica sucursal
    if (category === 'terminales' && branchId) {
        query += ' AND t.branch_id = ?';
        params.push(branchId);
    }

    query += ' ORDER BY s.name';

    const [rows] = await mainDbPool.query<RowDataPacket[]>(query, params);
    return rows;
};

/**
 * Sincroniza terminales como servicios
 */
export const syncTerminalsAsServices = async (branchId: number, userId: number): Promise<void> => {
    // 1. Obtener terminales de la sucursal
    const [terminals] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT * FROM pos_terminals WHERE branch_id = ? AND is_active = 1',
        [branchId]
    );

    // 2. Para cada terminal, crear o actualizar servicio
    for (const terminal of terminals) {
        const [existing] = await mainDbPool.query<RowDataPacket[]>(
            'SELECT id FROM sys_services WHERE terminal_id = ?',
            [terminal.id]
        );

        if (existing.length === 0) {
            // Crear nuevo servicio
            await mainDbPool.query(
                `INSERT INTO sys_services 
                (name, host, type, category, terminal_id, description, is_active, created_by)
                VALUES (?, ?, 'ip', 'terminales', ?, ?, 1, ?)`,
                [
                    terminal.name,
                    terminal.ip_address,
                    terminal.id,
                    `Terminal POS - ${terminal.name}`,
                    userId
                ]
            );
        } else {
            // Actualizar servicio existente
            await mainDbPool.query(
                `UPDATE sys_services 
                SET name = ?, host = ?, is_active = 1, updated_by = ?
                WHERE terminal_id = ?`,
                [terminal.name, terminal.ip_address, userId, terminal.id]
            );
        }
    }
};
