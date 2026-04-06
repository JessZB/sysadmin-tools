import { Request, Response } from 'express';
import * as categoriesService from './categories.service';
import * as auditService from '../audit/audit.service';
import * as usersService from '../users/users.service';

export const renderCategories = async (req: Request, res: Response) => {
    try {
        const categories = await categoriesService.getAllCategories();
        const groupedModules = await usersService.getSystemModules(); // Devuelve las cat con sus módulos
        
        res.render('categories/list', {
            page: 'categories',
            user: res.locals.user,
            categories: categories,
            groupedModules: groupedModules,
            script: 'categories.js'
        });
    } catch (error) {
        res.status(500).send('Error');
    }
};

export const create = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { name, description, icon } = req.body;
        
        const newId = await categoriesService.createCategory(name, description, icon);
        req.app.locals.menuCategories = await usersService.getSystemModules(); // Refrescar menú global
        auditService.logAction(currentUser.id, currentUser.branch_id, 'CREATE', 'CATEGORY', newId, `Creó categoría: ${name}`, req.ip);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const update = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { id } = req.params;
        const { name, description, icon } = req.body;
        
        await categoriesService.updateCategory(Number(id), name, description, icon);
        req.app.locals.menuCategories = await usersService.getSystemModules(); // Refrescar menú global
        auditService.logAction(currentUser.id, currentUser.branch_id, 'UPDATE', 'CATEGORY', Number(id), `Acutalizó categoría: ${name}`, req.ip);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const remove = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { id } = req.params;
        const targetId = Number(id);

        if (targetId === 1) {
            return res.status(400).json({ success: false, error: 'No se puede eliminar la categoría por defecto.' });
        }

        await categoriesService.deleteCategory(targetId);
        req.app.locals.menuCategories = await usersService.getSystemModules(); // Refrescar menú global
        auditService.logAction(currentUser.id, currentUser.branch_id, 'DELETE', 'CATEGORY', targetId, `Categoría eliminada ID: ${targetId}`, req.ip);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const assignModule = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { moduleCode, categoryId } = req.body;
        
        await categoriesService.updateModuleCategory(moduleCode, Number(categoryId));
        req.app.locals.menuCategories = await usersService.getSystemModules(); // Refrescar menú global
        auditService.logAction(currentUser.id, currentUser.branch_id, 'UPDATE', 'MODULE', Number(categoryId), `Asignó módulo ${moduleCode} a cat ${categoryId}`, req.ip);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
};
