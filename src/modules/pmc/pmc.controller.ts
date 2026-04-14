import { Request, Response } from 'express';
import * as pmcService from './pmc.service';
import * as auditService from '../audit/audit.service';
import { mainDbPool } from '../../shared/db/main.db';
import { RowDataPacket } from 'mysql2';
import multer from 'multer';
import path from 'path';

// Multer: imágenes en disco, Excel en memoria
export const uploadImage = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../../public/media/pmc')),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `pmc_${Date.now()}${ext}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        cb(null, allowed.test(file.mimetype));
    }
});

export const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── RENDER ──────────────────────────────────────────────────────

export const renderDashboard = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        let branchId = Number(req.query.branch_id) || user.branch_id;
        
        let branches: any[] = [];
        if (user.role === 'admin' || user.role === 'sysadmin') {
            const [bRows] = await mainDbPool.query<RowDataPacket[]>('SELECT id, name FROM sys_branches WHERE is_active = 1');
            branches = bRows;
            if (!branchId && branches.length > 0) {
                branchId = branches[0].id; // Fallback al primer branch activo
            }
        }
        
        // Si sigue sin haber branchId, fallback seguro
        branchId = branchId || 1;

        const [terminals] = await mainDbPool.query<RowDataPacket[]>(
            `SELECT id, name, ip_address FROM pos_terminals
             WHERE is_active = 1 AND branch_id = ? AND is_server = 1
             ORDER BY name ASC`,
            [branchId]
        );

        const aisles = await pmcService.getAisles(branchId);

        res.render('pmc/dashboard', {
            page: 'pmc',
            user,
            aisles,
            terminals,
            branches,       // Se pasa la lista de sucursales a la vista
            currentBranch: branchId,
            script: 'pmc.client.js'
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).send('Error al cargar PMC');
    }
};

export const renderAisleDetail = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        let branchId = Number(req.query.branch_id) || user.branch_id;
        
        let branches: any[] = [];
        if (user.role === 'admin' || user.role === 'sysadmin') {
            const [bRows] = await mainDbPool.query<RowDataPacket[]>('SELECT id, name FROM sys_branches WHERE is_active = 1');
            branches = bRows;
            if (!branchId && branches.length > 0) branchId = branches[0].id;
        }
        branchId = branchId || 1;
        
        const aisleId = Number(req.params.id);

        const [aisleRows] = await mainDbPool.query<RowDataPacket[]>(
            'SELECT * FROM pmc_aisles WHERE id = ? AND branch_id = ?',
            [aisleId, branchId]
        );
        if (aisleRows.length === 0) return res.status(404).send('Pasillo no encontrado');

        const aisle = aisleRows[0];
        const products = await pmcService.getAisleProducts(aisleId);

        const [terminals] = await mainDbPool.query<RowDataPacket[]>(
            `SELECT id, name, ip_address FROM pos_terminals
             WHERE is_active = 1 AND branch_id = ? AND is_server = 1
             ORDER BY name ASC`,
            [branchId]
        );

        res.render('pmc/aisle-detail', {
            page: 'pmc',
            user,
            aisle,
            products,
            terminals,
            branches,
            currentBranch: branchId,
            script: 'pmc.client.js'
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).send('Error');
    }
};

export const renderImport = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const branchId = user.branch_id || 1;
        const savedMapping = await pmcService.getExcelMapping(branchId);

        res.render('pmc/import', {
            page: 'pmc',
            user,
            savedMapping,
            script: 'pmc.client.js'
        });
    } catch (e: any) {
        res.status(500).send('Error');
    }
};

// ─── PRODUCTS API ─────────────────────────────────────────────────

/** Cache-aside: Busca local primero, luego en el servidor si no hay resultados */
export const apiSearchProducts = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const branchId = Number(req.query.branch_id) || user.branch_id || 1;
        const terminalId = Number(req.query.terminal_id);
        const search = String(req.query.search || '');
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        if (!terminalId) return res.status(400).json({ error: 'Se requiere terminal_id' });

        const result = await pmcService.searchProducts(branchId, terminalId, search, page, limit);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const apiUploadProductImage = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.id);
        if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

        const imagePath = `/media/pmc/${req.file.filename}`;
        await pmcService.updateProductImage(productId, imagePath);
        res.json({ success: true, image_path: imagePath });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

// ─── AISLES API ───────────────────────────────────────────────────

export const apiGetAisles = async (req: Request, res: Response) => {
    try {
        const branchId = res.locals.user.branch_id || 1;
        const aisles = await pmcService.getAisles(branchId);
        res.json({ aisles });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const apiCreateAisle = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        // Si el usuario es admin, puede elegir el branch_id desde el form, sino usa el asignado
        let branchId = (user.role === 'admin' || user.role === 'sysadmin') 
            ? (Number(req.body.branch_id) || user.branch_id || 1)
            : (user.branch_id || 1);
            
        const { name, number, color } = req.body;
        if (!name || !number) return res.status(400).json({ error: 'Nombre y número son requeridos' });

        const id = await pmcService.createAisle(branchId, name, Number(number), color);
        auditService.logAction(user.id, branchId, 'CREATE', 'PMC_AISLE', id, `Pasillo creado: ${name}`, req.ip);
        res.json({ success: true, id });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const apiUpdateAisle = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const { id } = req.params;
        const { name, number, color } = req.body;

        await pmcService.updateAisle(Number(id), name, Number(number), color);
        auditService.logAction(user.id, user.branch_id, 'UPDATE', 'PMC_AISLE', Number(id), `Pasillo editado: ${name}`, req.ip);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const apiDeleteAisle = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const { id } = req.params;

        await pmcService.deleteAisle(Number(id));
        auditService.logAction(user.id, user.branch_id, 'DELETE', 'PMC_AISLE', Number(id), `Pasillo eliminado ID: ${id}`, req.ip);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const apiReorderAisles = async (req: Request, res: Response) => {
    try {
        const { orders } = req.body; // [{ id, sort_order }]
        await pmcService.reorderAisles(orders);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

// ─── AISLE PRODUCTS API ───────────────────────────────────────────

export const apiGetAisleProducts = async (req: Request, res: Response) => {
    try {
        const aisleId = Number(req.params.id);
        const products = await pmcService.getAisleProducts(aisleId);
        res.json({ products });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const apiAddProductToAisle = async (req: Request, res: Response) => {
    try {
        const aisleId = Number(req.params.id);
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: 'product_id requerido' });

        await pmcService.addProductToAisle(aisleId, Number(product_id));
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const apiRemoveProductFromAisle = async (req: Request, res: Response) => {
    try {
        const aisleId = Number(req.params.id);
        const productId = Number(req.params.productId);

        await pmcService.removeProductFromAisle(aisleId, productId);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const apiReorderAisleProducts = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { orders } = req.body;
        await pmcService.reorderAisleProducts(Number(id), orders);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * Guarda el diseño completo del planograma (reemplaza todos los productos)
 */
export const apiUpdateAisleLayout = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { products } = req.body;
        await pmcService.updateAisleLayout(Number(id), products);
        res.json({ success: true });
    } catch (e: any) {
        console.error('[PMC] Error saving layout:', e);
        res.status(500).json({ error: e.message });
    }
};

// ─── PRICE UPDATES / EXCEL ────────────────────────────────────────

/** Preview del Excel: devuelve headers y primeras 5 filas */
export const apiExcelPreview = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
        const { headers, preview, totalRows } = pmcService.parseExcelPreview(req.file.buffer);
        res.json({ success: true, headers, preview, totalRows });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

/** Guarda el mapeo de columnas */
export const apiSaveExcelMapping = async (req: Request, res: Response) => {
    try {
        const branchId = res.locals.user.branch_id || 1;
        const { mapping } = req.body;
        await pmcService.saveExcelMapping(branchId, mapping);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

/** Procesa el Excel y aplica actualizaciones de precio */
export const apiProcessExcel = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const branchId = user.branch_id || 1;
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

        const mapping = JSON.parse(req.body.mapping || '{}');
        if (!mapping.code || !mapping.newPrice) {
            return res.status(400).json({ error: 'El mapeo debe incluir código y precio nuevo' });
        }

        const result = await pmcService.processExcelPriceUpdate(branchId, req.file.buffer, mapping, user.id);
        auditService.logAction(user.id, branchId, 'CREATE', 'PMC_PRICE_UPDATE', 0,
            `Excel importado: ${result.updated} actualizados, ${result.notFound} no encontrados`, req.ip);

        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const apiGetPriceUpdates = async (req: Request, res: Response) => {
    try {
        const branchId = res.locals.user.branch_id || 1;
        const updates = await pmcService.getPriceUpdates(branchId);
        res.json({ updates });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
