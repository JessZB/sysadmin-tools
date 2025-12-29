import { mainDbPool } from '../../shared/db/main.db';
import { Branch } from '../../shared/interfaces/branch.interface'; // Asegúrate de tener la interfaz
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const getAllBranches = async () => {
    // Traemos también quién la creó (auditoría básica)
    const query = `
        SELECT b.*, u.username as creator_name 
        FROM sys_branches b
        LEFT JOIN sys_users u ON b.created_by = u.id
        ORDER BY b.name ASC
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query);
    return rows;
};

export const createBranch = async (data: Partial<Branch>, createdBy: number) => {
    await mainDbPool.query<ResultSetHeader>(
        'INSERT INTO sys_branches (name, code, address, created_by, is_active) VALUES (?, ?, ?, ?, 1)',
        [data.name, data.code, data.address, createdBy]
    );
};

export const updateBranch = async (id: number, data: Partial<Branch>, updatedBy: number) => {
    await mainDbPool.query(
        'UPDATE sys_branches SET name=?, code=?, address=?, updated_by=?, is_active=? WHERE id=?',
        [data.name, data.code, data.address, updatedBy, data.is_active, id]
    );
};

export const deleteBranch = async (id: number) => {
    // Validación de seguridad: No borrar si tiene usuarios o terminales asociados
    // (Esto es opcional pero recomendado para integridad referencial)
    await mainDbPool.query('DELETE FROM sys_branches WHERE id = ?', [id]);
};