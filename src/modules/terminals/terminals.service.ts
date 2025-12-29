import { mainDbPool } from '../../shared/db/main.db';
import { Terminal } from '../../shared/interfaces/terminal.interface';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { encrypt } from '../../shared/utils/crypto.util';

// 1. OBTENER TODAS (Con nombre de sucursal)
export const getAllTerminals = async () => {
    // Hacemos JOIN para mostrar el nombre de la sucursal en la tabla
    const query = `
        SELECT t.*, b.name as branch_name 
        FROM pos_terminals t
        LEFT JOIN sys_branches b ON t.branch_id = b.id
    `;
    const [rows] = await mainDbPool.query<RowDataPacket[]>(query);
    return rows as Terminal[];
};

// 2. CREAR (Con Encriptación + Sucursal + Auditoría)
export const createTerminal = async (data: Terminal, creatorId: number) => {
    let dbPass = data.db_pass;

    // Tu lógica de encriptación
    if (dbPass) {
        dbPass = encrypt(dbPass);
    }

    const [result] = await mainDbPool.query<ResultSetHeader>(
        `INSERT INTO pos_terminals 
        (name, ip_address, db_user, db_pass, is_active, is_server, branch_id, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.name,
            data.ip_address,
            data.db_user,
            dbPass, // Contraseña ya encriptada
            1, // is_active default
            data.is_server ? 1 : 0,
            data.branch_id, // <--- Nueva vinculación a sucursal
            creatorId       // <--- Auditoría
        ]
    );
    return result.insertId;
};

// 3. ACTUALIZAR (Con Encriptación condicional + Sucursal + Auditoría)
export const updateTerminal = async (id: number, data: Terminal, updaterId: number, forceBlankPassword = false) => {
    // Campos base a actualizar
    let query = 'UPDATE pos_terminals SET name=?, ip_address=?, db_user=?, is_server=?, is_active=?, branch_id=?, updated_by=?';
    const params: any[] = [
        data.name,
        data.ip_address,
        data.db_user,
        data.is_server ? 1 : 0,
        data.is_active ? 1 : 0, // Aseguramos booleano a int
        data.branch_id,         // <--- Actualizar sucursal
        updaterId               // <--- Auditoría
    ];

    // Lógica de Contraseña
    if (forceBlankPassword) {
        // A. Usuario marcó "Borrar contraseña"
        query += ', db_pass = ?';
        params.push(''); // Guardamos vacío (¿o prefieres encriptar vacío? Usualmente vacío es vacío)
    } else if (data.db_pass && data.db_pass.trim() !== '') {
        // B. Usuario escribió nueva contraseña -> ENCRIPTAR
        query += ', db_pass = ?';
        const encryptedPass = encrypt(data.db_pass); // <--- APLICAMOS ENCRIPTACIÓN AQUÍ
        params.push(encryptedPass);
    }
    // C. Si no marcó nada, no tocamos la columna db_pass (se mantiene la vieja encriptada)

    query += ' WHERE id = ?';
    params.push(id);

    await mainDbPool.query(query, params);
};

// 4. ELIMINAR
export const deleteTerminal = async (id: number) => {
    await mainDbPool.query('DELETE FROM pos_terminals WHERE id = ?', [id]);
};