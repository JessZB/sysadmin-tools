import bcrypt from 'bcryptjs';
import { mainDbPool } from '../../shared/db/main.db';
import { User } from '../../shared/interfaces/user.interface';

import { RowDataPacket, ResultSetHeader } from 'mysql2';
// 1. GET ALL (Ahora con JOIN a sucursales)
export const getAllUsers = async () => {
    const query = `
        SELECT 
            u.id, u.username, u.role, u.branch_id, u.created_at, u.is_active,
            b.name as branch_name 
        FROM sys_users u
        LEFT JOIN sys_branches b ON u.branch_id = b.id
        ORDER BY u.id DESC
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query);
    return rows; // Devuelve usuarios con el nombre de su sucursal
};

// 2. CREATE (Con Branch y Auditoría)
export const createUser = async (user: User, pass: string, creatorId: number) => {
    const hash = await bcrypt.hash(pass, 10);

    // Asumimos que si no viene branch_id, es la Matriz (1)
    const branchId = user.branch_id || 1;

    await mainDbPool.query<ResultSetHeader>(
        `INSERT INTO sys_users (username, password_hash, role, branch_id, created_by, is_active) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [user.username, hash, user.role, branchId, creatorId]
    );
};

// 3. UPDATE (Con Branch y Auditoría)
export const updateUser = async (id: number, user: User, pass: string | undefined, updaterId: number) => {
    let query = 'UPDATE sys_users SET username=?, role=?, branch_id=?, updated_by=?';
    const params: any[] = [user.username, user.role, user.branch_id, updaterId];

    if (pass && pass.trim() !== '') {
        const hash = await bcrypt.hash(pass, 10);
        query += ', password_hash=?';
        params.push(hash);
    }

    query += ' WHERE id=?';
    params.push(id);

    await mainDbPool.query(query, params);
};

// 4. DELETE (Soft delete o físico, aquí mantenemos físico por ahora)
export const deleteUser = async (id: number) => {
    await mainDbPool.query('DELETE FROM sys_users WHERE id = ?', [id]);
};