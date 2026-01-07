import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserModules } from '../../modules/users/users.service';

const JWT_SECRET = process.env.JWT_SECRET || 'MI_CLAVE_SECRETA_COMPARTIDA';

export const requireModule = (moduleCode: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const currentUser = res.locals.user;

        if (!currentUser) return res.redirect('/login');

        try {
            // 1. Verificar módulos en tiempo real
            const currentModules = await getUserModules(currentUser.id, currentUser.role);

            // 2. Detectar cambios
            const sessionModules = currentUser.modules || [];

            // Comparación mejorada de arrays
            const hasChanged =
                currentModules.length !== sessionModules.length ||
                !currentModules.every((m: string) => sessionModules.includes(m)) ||
                !sessionModules.every((m: string) => currentModules.includes(m));

            // 3. Si cambió, actualizamos sesión (Token y locals)
            if (hasChanged) {
                console.log(`[Permission] Actualizando permisos para usuario ${currentUser.username}`);
                console.log(`[Permission] Módulos anteriores:`, sessionModules);
                console.log(`[Permission] Módulos nuevos:`, currentModules);

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

            // 4. Verificación normal de permisos
            // REGLA DE ORO: Si es admin, tiene pase VIP
            if (currentUser.role === 'admin') {
                return next();
            }

            // Si no es admin, verificamos si tiene el módulo en su lista (ahora actualizada)
            if (currentModules.includes(moduleCode)) {
                return next();
            }

            // Si falla, acceso denegado
            if (req.xhr || (req.headers.accept?.indexOf('json') ?? -1) > -1) {
                return res.status(403).json({ error: 'Acceso denegado a este módulo.' });
            }

            // Renderizar vista de error
            return res.status(403).render('error/403', {
                message: `No tienes permisos para acceder al módulo: ${moduleCode}`
            });

        } catch (error) {
            console.error('Error en permission middleware:', error);
            // Si falla la verificación de DB, por seguridad bloqueamos
            return res.status(500).render('error/500', { error: 'Error verificando permisos' });
        }
    };
};