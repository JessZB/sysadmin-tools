import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    // Si la petición espera JSON (es una API call), respondemos JSON
    if (req.xhr || (req.headers.accept?.indexOf('json') ?? -1) > -1) {
        return res.status(404).json({
            success: false,
            error: 'Recurso no encontrado (404)'
        });
    }

    // Si es una navegación normal, renderizamos la vista
    res.status(404).render('error/404');
};