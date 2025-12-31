import { mainDbPool } from '../../shared/db/main.db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';

// Clave secreta (idealmente en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'MI_CLAVE_SECRETA_COMPARTIDA';

export const login = async (username: string, pass: string): Promise<{ token: string; user: any } | null> => {
    // 1. Buscar usuario y sucursal
    const query = `
        SELECT u.id, u.username, u.password_hash, u.role, u.branch_id, b.name as branch_name
        FROM sys_users u
        LEFT JOIN sys_branches b ON u.branch_id = b.id
        WHERE u.username = ? AND u.is_active = 1
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query, [username]);
    if (rows.length === 0) return null;
    const user = rows[0];

    // 2. Verificar Password
    const match = await bcrypt.compare(pass, user.password_hash);
    if (!match) return null;

    // 3. OBTENER MÓDULOS (Lógica "Super Admin")
    let allowedModules: string[] = [];

    if (user.role === 'admin') {
        // SI ES ADMIN: Traemos TODOS los módulos del sistema automáticamente
        const [allMods] = await mainDbPool.query<RowDataPacket[]>('SELECT code FROM sys_modules');
        allowedModules = allMods.map(m => m.code);
    } else {
        // SI ES OTRO ROL: Traemos solo los asignados
        const [userMods] = await mainDbPool.query<RowDataPacket[]>(
            'SELECT module_code FROM sys_user_modules WHERE user_id = ?',
            [user.id]
        );
        allowedModules = userMods.map(m => m.module_code);
    }

    // 4. Payload
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        modules: allowedModules // <--- El array de permisos
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    return { token, user: payload };
};