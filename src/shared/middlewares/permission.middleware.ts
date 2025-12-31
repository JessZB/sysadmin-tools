import { Request, Response, NextFunction } from 'express';

export const requireModule = (moduleCode: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const currentUser = res.locals.user;

        if (!currentUser) return res.redirect('/login');

        // REGLA DE ORO: Si es admin, tiene pase VIP
        if (currentUser.role === 'admin') {
            return next();
        }

        // Si no es admin, verificamos si tiene el módulo en su lista
        if (currentUser.modules && currentUser.modules.includes(moduleCode)) {
            return next();
        }

        // Si falla, acceso denegado
        if (req.xhr || (req.headers.accept?.indexOf('json') ?? -1) > -1) {
            return res.status(403).json({ error: 'Acceso denegado a este módulo.' });
        }

        // Renderizar vista de error (asegúrate de tener src/views/error/403.ejs)
        return res.status(403).render('error/403', {
            message: `No tienes permisos para acceder al módulo: ${moduleCode}`
        });
    };
};