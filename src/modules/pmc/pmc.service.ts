import { mainDbPool } from '../../shared/db/main.db';
import { getSqlServerConnection } from '../../shared/db/mssql.factory';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import sql from 'mssql';
import * as XLSX from 'xlsx';

// ─── PRODUCTS ────────────────────────────────────────────────────

const PRODUCT_DB = 'VAD10'; // Base de datos de productos en el servidor

/**
 * Construye la configuración de conexión para un terminal.
 * SOLO para consultas de LECTURA — nunca para escritura.
 */
const buildTerminalConfig = (terminal: any): sql.config => ({
    user: terminal.db_user,
    password: require('../../shared/utils/crypto.util').decrypt(terminal.db_pass),
    server: terminal.ip_address,
    database: PRODUCT_DB,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    connectionTimeout: 8000,
    requestTimeout: 15000
});

/**
 * CACHE-ASIDE: Búsqueda unificada de productos.
 *
 * Flujo:
 *   1. Busca en pmc_products (local) para la sucursal.
 *   2. Si no hay suficientes resultados locales (o no existe el producto exacto),
 *      consulta MA_PRODUCTOS en el servidor remoto (SOLO LECTURA).
 *   3. Guarda automáticamente los productos nuevos del servidor en pmc_products.
 *   4. Devuelve resultados unificados.
 */
export const searchProducts = async (
    branchId: number,
    terminalId: number,
    search: string = '',
    page: number = 1,
    limit: number = 50
) => {
    const offset = (page - 1) * limit;
    const likeSearch = `%${search}%`;

    // 1. Buscar en caché local
    const [localRows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT p.*,
            COALESCE(u.new_price, p.price1) AS current_price,
            u.old_price, u.new_price, u.price_updated_at, u.tags_printed,
            CASE WHEN u.new_price IS NOT NULL THEN 1 ELSE 0 END AS has_price_update,
            'local' AS source
         FROM pmc_products p
         LEFT JOIN pmc_price_updates u
            ON u.product_code = p.product_code AND u.branch_id = p.branch_id
         WHERE p.branch_id = ? AND p.is_active = 1
           AND (p.description LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)
         ORDER BY p.product_code ASC
         LIMIT ? OFFSET ?`,
        [branchId, likeSearch, likeSearch, likeSearch, limit, offset]
    );

    const [[countRow]] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM pmc_products
         WHERE branch_id = ? AND is_active = 1
           AND (description LIKE ? OR product_code LIKE ? OR brand LIKE ?)`,
        [branchId, likeSearch, likeSearch, likeSearch]
    );

    const localTotal = (countRow as any).total || 0;

    // Si hay resultados locales suficientes para esta página, devolverlos directo
    if (localRows.length >= limit || (localTotal > 0 && offset < localTotal)) {
        return {
            products: localRows,
            total: localTotal,
            page,
            limit,
            source: 'local'
        };
    }

    // 2. No hay suficientes locales → consultar el servidor remoto (SOLO LECTURA)
    const [termRows] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT * FROM pos_terminals WHERE id = ?', [terminalId]
    );
    if (termRows.length === 0) {
        // No hay terminal configurada, retornar lo que hay local
        return { products: localRows, total: localTotal, page, limit, source: 'local' };
    }

    const terminal = termRows[0] as any;
    const pool = await new sql.ConnectionPool(buildTerminalConfig(terminal)).connect();

    try {
        const serverResult = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT
                    c_Codigo, c_Descri, cu_Descripcion_Corta,
                    c_Departamento, c_Grupo, c_Subgrupo, c_Marca,
                    c_Presenta, n_Precio1, n_Impuesto1, Cant_Decimales,
                    n_Activo, Hablador, Update_Date
                FROM [dbo].[MA_PRODUCTOS]
                WHERE n_Activo = 1
                  AND (c_Descri LIKE @search OR c_Codigo LIKE @search OR c_Marca LIKE @search)
                ORDER BY c_Codigo ASC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        const serverCountRes = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .query(`SELECT COUNT(*) as total FROM [dbo].[MA_PRODUCTOS]
                    WHERE n_Activo = 1
                      AND (c_Descri LIKE @search OR c_Codigo LIKE @search OR c_Marca LIKE @search)`);

        const serverRows = serverResult.recordset;
        const serverTotal = serverCountRes.recordset[0].total;

        // 3. Auto-guardar en caché local los productos encontrados en el servidor
        if (serverRows.length > 0) {
            const values = serverRows.map((r: any) => [
                branchId, terminalId,
                r.c_Codigo?.trim(),
                r.c_Descri?.trim(),
                r.cu_Descripcion_Corta?.trim() || null,
                r.c_Departamento?.trim() || null,
                r.c_Grupo?.trim() || null,
                r.c_Subgrupo?.trim() || null,
                r.c_Marca?.trim() || null,
                r.c_Presenta?.trim() || null,
                r.n_Precio1 || 0,
                r.n_Impuesto1 || 0,
                r.Cant_Decimales || 2,
                r.n_Activo ? 1 : 0,
                r.Hablador ? 1 : 0,
                r.Update_Date || null
            ]);

            // INSERT IGNORE: no sobreescribe entradas ya existentes
            await mainDbPool.query(
                `INSERT IGNORE INTO pmc_products
                    (branch_id, terminal_id, product_code, description, short_desc,
                     department, group_code, subgroup_code, brand, unit,
                     price1, tax_pct, decimals, is_active, has_hablador, source_updated_at)
                 VALUES ?`,
                [values]
            );
        }

        // 4. IMPORTANTE: Re-consultar la base de datos local para obtener los IDs reales (locales)
        // Esto es necesario porque el frontend necesita el ID de la tabla pmc_products para las asignaciones.
        const serverCodes = serverRows.map((r: any) => r.c_Codigo?.trim()).filter(Boolean);
        let finalProducts: RowDataPacket[] = [];
        
        if (serverCodes.length > 0) {
            const [finalRows] = await mainDbPool.query<RowDataPacket[]>(
                `SELECT p.*,
                    COALESCE(u.new_price, p.price1) AS current_price,
                    u.old_price, u.new_price, u.price_updated_at,
                    CASE WHEN u.new_price IS NOT NULL THEN 1 ELSE 0 END AS has_price_update,
                    'server' AS source
                 FROM pmc_products p
                 LEFT JOIN pmc_price_updates u
                    ON u.product_code = p.product_code AND u.branch_id = p.branch_id
                 WHERE p.branch_id = ? AND p.product_code IN (?)`,
                [branchId, serverCodes]
            );
            finalProducts = finalRows;
        }

        return {
            products: finalProducts,
            total: serverTotal,
            page,
            limit,
            source: 'server'
        };
    } finally {
        if (pool) await pool.close();
    }
};

/**
 * Lista de productos locales de una sucursal (paginado, con búsqueda).
 */
export const getLocalProducts = async (
    branchId: number,
    search: string = '',
    page: number = 1,
    limit: number = 50
) => {
    const offset = (page - 1) * limit;
    const likeSearch = `%${search}%`;

    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT p.*,
            COALESCE(u.new_price, p.price1) AS current_price,
            u.old_price, u.new_price, u.price_updated_at,
            u.tags_printed,
            CASE WHEN u.id IS NOT NULL AND u.new_price != p.price1 THEN 1 ELSE 0 END AS has_price_update
         FROM pmc_products p
         LEFT JOIN pmc_price_updates u ON p.product_code = u.product_code AND p.branch_id = u.branch_id
         WHERE p.branch_id = ? AND p.is_active = 1
           AND (p.description LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)
         ORDER BY p.product_code ASC
         LIMIT ? OFFSET ?`,
        [branchId, likeSearch, likeSearch, likeSearch, limit, offset]
    );

    const [[countRow]] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM pmc_products
         WHERE branch_id = ? AND is_active = 1
           AND (description LIKE ? OR product_code LIKE ? OR brand LIKE ?)`,
        [branchId, likeSearch, likeSearch, likeSearch]
    );

    return { products: rows, total: (countRow as any).total, page, limit };
};

/**
 * Actualiza la imagen de un producto local.
 */
export const updateProductImage = async (productId: number, imagePath: string) => {
    await mainDbPool.query(
        'UPDATE pmc_products SET image_path = ? WHERE id = ?',
        [imagePath, productId]
    );
};

// ─── AISLES ──────────────────────────────────────────────────────

export const getAisles = async (branchId: number) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT a.*,
            COUNT(ap.id) as product_count,
            SUM(CASE WHEN u.id IS NOT NULL AND u.new_price IS NOT NULL THEN 1 ELSE 0 END) as updated_count
         FROM pmc_aisles a
         LEFT JOIN pmc_aisle_products ap ON ap.aisle_id = a.id
         LEFT JOIN pmc_products p ON p.id = ap.product_id
         LEFT JOIN pmc_price_updates u ON u.product_code = p.product_code AND u.branch_id = a.branch_id
         WHERE a.branch_id = ? AND a.is_active = 1
         GROUP BY a.id
         ORDER BY a.sort_order ASC, a.number ASC`,
        [branchId]
    );
    return rows;
};

export const createAisle = async (branchId: number, name: string, number: number, color: string) => {
    // Calcular sort_order siguiente
    const [[maxRow]] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM pmc_aisles WHERE branch_id = ?',
        [branchId]
    );
    const sortOrder = (maxRow as any).next_order;

    const [res] = await mainDbPool.query<ResultSetHeader>(
        `INSERT INTO pmc_aisles (branch_id, name, number, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
        [branchId, name, number, color || '#8d99ae', sortOrder]
    );
    return res.insertId;
};

export const updateAisle = async (id: number, name: string, number: number, color: string) => {
    await mainDbPool.query(
        'UPDATE pmc_aisles SET name = ?, number = ?, color = ?, updated_at = NOW() WHERE id = ?',
        [name, number, color, id]
    );
};

export const deleteAisle = async (id: number) => {
    await mainDbPool.query('DELETE FROM pmc_aisles WHERE id = ?', [id]);
};

export const reorderAisles = async (orders: { id: number; sort_order: number }[]) => {
    const conn = await mainDbPool.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of orders) {
            await conn.query('UPDATE pmc_aisles SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

// ─── AISLE PRODUCTS ──────────────────────────────────────────────

export const getAisleProducts = async (aisleId: number) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT ap.id as assignment_id, ap.display_order, ap.shelf_number, p.*,
            COALESCE(u.new_price, p.price1) AS current_price,
            u.old_price, u.new_price, u.price_updated_at, u.tags_printed,
            CASE WHEN u.id IS NOT NULL AND u.new_price != p.price1 THEN 1 ELSE 0 END AS has_price_update
         FROM pmc_aisle_products ap
         JOIN pmc_products p ON p.id = ap.product_id
         LEFT JOIN pmc_price_updates u
            ON u.product_code = p.product_code AND u.branch_id = p.branch_id
         WHERE ap.aisle_id = ?
         ORDER BY ap.shelf_number ASC, ap.display_order ASC`,
        [aisleId]
    );
    return rows;
};

export const addProductToAisle = async (aisleId: number, productId: number) => {
    const [[maxRow]] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM pmc_aisle_products WHERE aisle_id = ?',
        [aisleId]
    );
    const displayOrder = (maxRow as any).next_order;

    await mainDbPool.query(
        `INSERT IGNORE INTO pmc_aisle_products (aisle_id, product_id, display_order) VALUES (?, ?, ?)`,
        [aisleId, productId, displayOrder]
    );
};

export const removeProductFromAisle = async (aisleId: number, productId: number) => {
    await mainDbPool.query(
        'DELETE FROM pmc_aisle_products WHERE aisle_id = ? AND product_id = ?',
        [aisleId, productId]
    );
};

export const reorderAisleProducts = async (aisleId: number, orders: { product_id: number; display_order: number }[]) => {
    const conn = await mainDbPool.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of orders) {
            await conn.query(
                'UPDATE pmc_aisle_products SET display_order = ? WHERE aisle_id = ? AND product_id = ?',
                [item.display_order, aisleId, item.product_id]
            );
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

/**
 * Reemplaza todos los productos de un pasillo (Guardado de Planograma)
 */
export const updateAisleLayout = async (aisleId: number, products: { product_id: number, shelf_number: number, display_order: number }[]) => {
    const conn = await mainDbPool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Limpiar pasillo actual
        await conn.query('DELETE FROM pmc_aisle_products WHERE aisle_id = ?', [aisleId]);

        // 2. Insertar nueva disposición
        if (products.length > 0) {
            const values = products.map(p => [aisleId, p.product_id, p.shelf_number || 1, p.display_order]);
            await conn.query(
                'INSERT INTO pmc_aisle_products (aisle_id, product_id, shelf_number, display_order) VALUES ?',
                [values]
            );
        }

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

// ─── PRICE UPDATES / EXCEL ────────────────────────────────────────

/**
 * Obtiene el mapeo de columnas guardado para esta sucursal.
 */
export const getExcelMapping = async (branchId: number) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        'SELECT field_target, field_source FROM pmc_excel_mapping WHERE branch_id = ?',
        [branchId]
    );
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.field_target] = r.field_source; });
    return map;
};

/**
 * Guarda el mapeo de columnas para la sucursal (UPSERT).
 */
export const saveExcelMapping = async (branchId: number, mapping: Record<string, string>) => {
    const conn = await mainDbPool.getConnection();
    try {
        await conn.beginTransaction();
        for (const [target, source] of Object.entries(mapping)) {
            await conn.query(
                `INSERT INTO pmc_excel_mapping (branch_id, field_target, field_source)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE field_source = VALUES(field_source), updated_at = NOW()`,
                [branchId, target, source]
            );
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
};

/**
 * Procesa el buffer del Excel subido y detecta cambios de precio.
 * Retorna preview (primeras 5 filas) y headers para el mapeo.
 */
export const parseExcelPreview = (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const preview = rows.slice(0, 5);

    return { headers, preview, totalRows: rows.length, rows };
};

/**
 * Importa los datos del Excel mapeados y los cruza con los productos del pasillo.
 * Solo afecta pmc_price_updates — NUNCA toca tablas de terminales.
 */
export const processExcelPriceUpdate = async (
    branchId: number,
    buffer: Buffer,
    mapping: { code: string; name?: string; oldPrice?: string; newPrice: string; updatedAt?: string },
    userId: number
): Promise<{ matched: number; updated: number; notFound: number }> => {
    const { rows } = parseExcelPreview(buffer);

    let matched = 0;
    let updated = 0;
    let notFound = 0;

    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);

        for (const row of batch) {
            const code = String(row[mapping.code] || '').trim();
            if (!code) continue;

            const newPrice = parseFloat(row[mapping.newPrice]) || 0;
            const oldPrice = mapping.oldPrice ? parseFloat(row[mapping.oldPrice]) || null : null;
            const productName = mapping.name ? String(row[mapping.name] || '').trim() : null;
            const updatedAt = mapping.updatedAt ? (row[mapping.updatedAt] || new Date()) : new Date();

            // Verificar que el producto existe en la sucursal
            const [[existing]] = await mainDbPool.query<RowDataPacket[]>(
                'SELECT id, price1 FROM pmc_products WHERE branch_id = ? AND product_code = ?',
                [branchId, code]
            );

            if (!existing) { notFound++; continue; }
            matched++;

            // UPSERT en pmc_price_updates
            const [res] = await mainDbPool.query<ResultSetHeader>(
                `INSERT INTO pmc_price_updates
                    (branch_id, product_code, product_name, old_price, new_price, price_updated_at, imported_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    old_price = VALUES(old_price),
                    new_price = VALUES(new_price),
                    product_name = VALUES(product_name),
                    price_updated_at = VALUES(price_updated_at),
                    tags_printed = 0,
                    imported_at = NOW(),
                    imported_by = VALUES(imported_by)`,
                [branchId, code, productName, oldPrice, newPrice, updatedAt, userId]
            );

            if (res.affectedRows > 0) updated++;
        }
    }

    return { matched, updated, notFound };
};

/**
 * Obtiene el resumen de productos con precio actualizado en una sucursal.
 */
export const getPriceUpdates = async (branchId: number) => {
    const [rows] = await mainDbPool.query<RowDataPacket[]>(
        `SELECT u.*, p.description, p.short_desc, p.price1 as local_price, p.image_path
         FROM pmc_price_updates u
         LEFT JOIN pmc_products p ON p.product_code = u.product_code AND p.branch_id = u.branch_id
         WHERE u.branch_id = ?
         ORDER BY u.imported_at DESC`,
        [branchId]
    );
    return rows;
};
