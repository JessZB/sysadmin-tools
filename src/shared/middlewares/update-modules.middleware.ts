import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserModules } from '../../modules/users/users.service';

const JWT_SECRET = process.env.JWT_SECRET || 'MI_CLAVE_SECRETA_COMPARTIDA';

/**
 * Middleware para actualizar los módulos asignados al usuario
 * sin verificar permisos específicos.
 * Útil para rutas como /home donde necesitamos módulos actualizados
 * pero no hay un módulo específico que verificar.
 */
export const updateUserModules = async (req: Request, res: Response, next: NextFunction) => {
    const currentUser = res.locals.user;

    if (!currentUser) {
        return res.redirect('/login');
    }

    try {
        // 1. Obtener módulos actuales de la base de datos
        const currentModules = await getUserModules(currentUser.id, currentUser.role);

        // 2. Obtener módulos de la sesión
        const sessionModules = currentUser.modules || [];

        // 3. Comparar si han cambiado
        const hasChanged =
            currentModules.length !== sessionModules.length ||
            !currentModules.every((m: string) => sessionModules.includes(m)) ||
            !sessionModules.every((m: string) => currentModules.includes(m));

        // 4. Si cambió, actualizamos sesión (Token y locals)
        if (hasChanged) {
            console.log(`[UpdateModules] Actualizando módulos para usuario ${currentUser.username}`);
            console.log(`[UpdateModules] Módulos anteriores:`, sessionModules);
            console.log(`[UpdateModules] Módulos nuevos:`, currentModules);

            // Crear payload completo con todos los campos del usuario
            const payload = {
                id: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
                branch_id: currentUser.branch_id,
                branch_name: currentUser.branch_name,
                modules: currentModules
            };

            // Generar nuevo token
            const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

            // Actualizar cookie
            res.cookie('auth_token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 28800000 // 8 horas
            });

            // Actualizar locals para esta request
            res.locals.user = payload;
        }

        next();
    } catch (error) {
        console.error('Error en updateUserModules middleware:', error);
        // En caso de error, continuamos sin actualizar
        // para no bloquear el acceso a /home
        next();
    }
};
