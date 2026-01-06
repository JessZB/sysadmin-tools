import { Request, Response } from 'express';
import * as servicesService from './services.service';

/**
 * Renderiza la vista principal de servicios
 */
export const renderList = async (req: Request, res: Response) => {
    res.render('services/list', {
        user: res.locals.user,
        title: 'Monitoreo de Servicios'
    });
};

/**
 * Obtiene la lista de servicios en formato JSON
 */
export const getListJson = async (req: Request, res: Response) => {
    try {
        const services = await servicesService.getAllServices();
        res.json(services);
    } catch (e: any) {
        console.error('Error obteniendo servicios:', e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * Crea un nuevo servicio
 */
export const create = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        const serviceId = await servicesService.createService(req.body, userId);
        res.json({ success: true, id: serviceId });
    } catch (e: any) {
        console.error('Error creando servicio:', e);
        res.status(400).json({ success: false, error: e.message });
    }
};

/**
 * Actualiza un servicio existente
 */
export const update = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.user.id;
        await servicesService.updateService(Number(req.params.id), req.body, userId);
        res.json({ success: true });
    } catch (e: any) {
        console.error('Error actualizando servicio:', e);
        res.status(400).json({ success: false, error: e.message });
    }
};

/**
 * Elimina un servicio
 */
export const remove = async (req: Request, res: Response) => {
    try {
        await servicesService.deleteService(Number(req.params.id));
        res.json({ success: true });
    } catch (e: any) {
        console.error('Error eliminando servicio:', e);
        res.status(400).json({ success: false, error: e.message });
    }
};

/**
 * Ejecuta ping a un servicio individual
 */
export const pingSingle = async (req: Request, res: Response) => {
    try {
        const result = await servicesService.pingServiceAndSave(Number(req.params.id));
        res.json({ success: true, result });
    } catch (e: any) {
        console.error('Error ejecutando ping:', e);
        res.status(500).json({ success: false, error: e.message });
    }
};

/**
 * Ejecuta ping a múltiples servicios
 */
export const pingBatch = async (req: Request, res: Response) => {
    try {
        const { serviceIds } = req.body;

        if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de IDs de servicios' });
        }

        console.log(`🏓 Ejecutando ping batch a ${serviceIds.length} servicio(s)...`);

        // Ejecutar pings en paralelo
        const results = await Promise.all(
            serviceIds.map(id => servicesService.pingServiceAndSave(id))
        );

        res.json({ success: true, results });
    } catch (e: any) {
        console.error('Error ejecutando ping batch:', e);
        res.status(500).json({ success: false, error: e.message });
    }
};

/**
 * Obtiene el historial de verificaciones de un servicio
 */
export const getHistory = async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const history = await servicesService.getServiceHistory(Number(req.params.id), limit);
        res.json(history);
    } catch (e: any) {
        console.error('Error obteniendo historial:', e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * Obtiene servicios filtrados por categoría
 */
export const getByCategory = async (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        const currentUser = res.locals.user;

        let branchId: number | undefined;

        // Si es categoría terminales
        if (category === 'terminales') {
            // Si es admin y se especifica branch_id en query
            if (currentUser.role === 'admin' && req.query.branch_id) {
                branchId = parseInt(req.query.branch_id as string);
            } else {
                // Usuario regular: usar su sucursal
                branchId = currentUser.branch_id;
            }

            // Sincronizar terminales antes de devolver
            if (branchId) {
                await servicesService.syncTerminalsAsServices(branchId, currentUser.id);
            }
        }

        const services = await servicesService.getServicesByCategory(category, branchId);
        res.json(services);
    } catch (e: any) {
        console.error('Error getting services by category:', e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * Obtiene la lista de sucursales (solo admin)
 */
export const getBranches = async (req: Request, res: Response) => {
    try {
        const { mainDbPool } = await import('../../shared/db/main.db');
        const [branches] = await mainDbPool.query(
            'SELECT id, name FROM sys_branches WHERE is_active = 1 ORDER BY name'
        );
        res.json(branches);
    } catch (e: any) {
        console.error('Error getting branches:', e);
        res.status(500).json({ error: e.message });
    }
};
