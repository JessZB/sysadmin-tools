import bcrypt from 'bcryptjs';
import { mainDbPool } from '../../shared/db/main.db';
import { User } from '../../shared/interfaces/user.interface';

import { RowDataPacket, ResultSetHeader } from 'mysql2';
// 1. GET ALL (Ahora con JOIN a sucursales)
export const getAllUsers = async () => {
    // Agregamos LEFT JOIN a sys_user_modules y GROUP_CONCAT
    const query = `
        SELECT 
            u.id, u.username, u.role, u.branch_id, u.created_at, u.is_active,
            b.name as branch_name,
            GROUP_CONCAT(um.module_code) as modules_str -- <--- NUEVO CAMPO
        FROM sys_users u
        LEFT JOIN sys_branches b ON u.branch_id = b.id
        LEFT JOIN sys_user_modules um ON u.id = um.user_id
        GROUP BY u.id -- Agrupar obligatoriamente
        ORDER BY u.id DESC
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query);
    return rows;
};


export const getSystemModules = async () => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT code, name, icon FROM sys_modules ORDER BY name ASC');
    return rows;
};

// 2. CREATE (Con Branch y Auditoría)
export const createUser = async (user: User, pass: string, creatorId: number, modules: string[] = []): Promise<number> => {
    const conn = await mainDbPool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Crear Usuario
        const hash = await bcrypt.hash(pass, 10);
        // Si no viene branch_id, asignamos 1 (Matriz) por defecto
        const branchId = user.branch_id || 1;

        const [res] = await conn.query<ResultSetHeader>(
            `INSERT INTO sys_users (username, password_hash, role, branch_id, created_by, is_active) 
             VALUES (?, ?, ?, ?, ?, 1)`,
            [user.username, hash, user.role, branchId, creatorId]
        );
        const newUserId = res.insertId;

        // 2. Asignar Módulos (Si corresponde)
        // Nota: Aunque el admin tiene acceso total por código, es buena práctica guardarlos si se envían
        if (modules && modules.length > 0) {
            const values = modules.map(code => [newUserId, code]);
            await conn.query('INSERT INTO sys_user_modules (user_id, module_code) VALUES ?', [values]);
        }

        await conn.commit();

        return newUserId; // <--- IMPORTANTE: Retornamos el ID para la auditoría

    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
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