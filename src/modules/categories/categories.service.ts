import { mainDbPool } from '../../shared/db/main.db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const getAllCategories = async () => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>('SELECT * FROM sys_module_categories ORDER BY name ASC');
    return rows;
};

export const createCategory = async (name: string, description: string, icon: string) => {
    const [res] = await mainDbPool.query<ResultSetHeader>(
        'INSERT INTO sys_module_categories (name, description, icon) VALUES (?, ?, ?)',
        [name, description, icon || 'bi-folder']
    );
    return res.insertId;
};

export const updateCategory = async (id: number, name: string, description: string, icon: string) => {
    await mainDbPool.query(
        'UPDATE sys_module_categories SET name=?, description=?, icon=? WHERE id=?',
        [name, description, icon, id]
    );
};

export const deleteCategory = async (id: number) => {
    // Si se borra, los módulos pasarán a tener category_id = NULL gracias a ON DELETE SET NULL
    await mainDbPool.query('DELETE FROM sys_module_categories WHERE id=?', [id]);
    // Asignarlos a la categoría "1" (Sin Categoría)
    await mainDbPool.query('UPDATE sys_modules SET category_id=1 WHERE category_id IS NULL');
};

export const updateModuleCategory = async (moduleCode: string, categoryId: number) => {
    await mainDbPool.query('UPDATE sys_modules SET category_id=? WHERE code=?', [categoryId, moduleCode]);
};
