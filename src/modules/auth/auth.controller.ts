import { Request, Response } from 'express';
// Ya no necesitamos bcrypt ni jwt ni mainDbPool aquí, el servicio se encarga
import * as authService from './auth.service';
import * as auditService from '../audit/audit.service'; // Importamos el auditor

// GET: Muestra el formulario
export const showLogin = (req: Request, res: Response) => {
    if (req.cookies.auth_token) return res.redirect('/home');
    res.render('auth/login');
};

// POST: Procesa el login
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // 1. LLAMAMOS AL SERVICIO (Él tiene la lógica de branches y validación)
        const result = await authService.login(username, password);

        // 2. Si el servicio retorna null, credenciales malas
        if (!result) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Si llegamos aquí, result trae { token, user } con todos los datos nuevos (branch_id, etc)
        const { token, user } = result;

        // 3. REGISTRAR AUDITORÍA (Login Exitoso)
        // Usamos el ID y Branch del usuario que nos devolvió el servicio
        auditService.logAction(
            user.id,
            user.branch_id,
            'LOGIN',
            'USER',
            user.id,
            `Inicio de sesión exitoso`,
            req.ip
        );

        // 4. Guardar Cookie (HttpOnly)
        // La lógica HTTP de cookies sí pertenece al controlador
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 28800000 // 8 horas
        });

        // 5. Responder al Frontend
        return res.json({ success: true, redirectUrl: '/home' });

    } catch (error: any) {
        console.error('Error en login controller:', error);

        if (error.message === 'NO_MODULES_ASSIGNED') {
            return res.status(403).json({ success: false, error: 'No tienes módulos asignados. Contacta al administrador.' });
        }

        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('auth_token');
    res.redirect('/login'); // Asumo que tu ruta de login es /login o /auth/login
};