import { Request, Response } from 'express';
import * as userService from './users.service';
import { getAllBranches } from '../branches/branches.service';
import * as auditService from '../audit/audit.service';

export const renderUserList = async (req: Request, res: Response) => {
    try {
        // Obtenemos sucursales para pintarlas en el modal
        const branches = await getAllBranches();

        const systemModules = await userService.getSystemModules();

        // La tabla carga datos por AJAX, así que aquí no hace falta traer usuarios, solo la estructura
        res.render('users/list', {
            page: 'users',
            user: res.locals.user,
            systemModules,
            branches: branches, // <--- ENVIAMOS LAS SUCURSALES A LA VISTA
            script: 'users.client.js'
        });
    } catch (error) {
        // Manejo de error
    }
};

// 2. GET DATA JSON (Usado por la tabla)
export const getUsersData = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 3. CREATE
export const create = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        const { username, password, role, branch_id, modules } = req.body;

        // 1. Llamamos al servicio y recibimos el ID nuevo
        const newUserId = await userService.createUser(
            { username, role, branch_id },
            password,
            currentUser.id,
            modules
        );


        auditService.logAction(
            currentUser.id,          // Quién lo hizo (Admin logueado)
            currentUser.branch_id,   // Desde qué sucursal
            'CREATE',                // Acción
            'USER',                  // Entidad
            newUserId,               // ID del usuario creado
            `Creó usuario: ${username} (Rol: ${role})`, // Detalle legible
            req.ip                   // IP de origen
        );

        res.json({ success: true });
    } catch (error: any) {
        // Error handling mejorado (ej: duplicados)
        console.error(error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// 4. UPDATE
export const update = async (req: Request, res: Response) => {
    try {
        const currentUser = res.locals.user;
        if (currentUser.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

        const { id } = req.params;
        const { username, password, role, branch_id } = req.body;

        await userService.updateUser(Number(id), { username, role, branch_id }, password, currentUser.id);

        // Auditoría
        auditService.logAction(
            currentUser.id,
            currentUser.branch_id,
            'UPDATE',
            'USER',
            Number(id),
            `Usuario actualizado: ${username} (${role})`,
            req.ip
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const remove = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const targetId = Number(id);
        const currentUser = res.locals.user;

        // 1. VALIDACIÓN DE ROL
        if (currentUser.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar usuarios.' });
        }

        // 2. VALIDACIÓN DE AUTO-ELIMINACIÓN
        // Comparamos el ID que viene en la URL con el ID del token de sesión
        if (targetId === currentUser.id) {
            return res.status(400).json({ success: false, error: 'No puedes eliminar tu propio usuario mientras estás conectado.' });
        }

        await userService.deleteUser(targetId);

        // Auditoría
        auditService.logAction(
            currentUser.id,
            currentUser.branch_id,
            'DELETE',
            'USER',
            targetId,
            `Usuario eliminado ID: ${targetId}`,
            req.ip
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};