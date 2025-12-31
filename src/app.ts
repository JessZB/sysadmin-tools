import path from 'path';

import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';

import * as authController from './modules/auth/auth.controller';
import homeRoutes from './modules/home/home.routes';
import usersRoutes from './modules/users/users.routes';
import terminalsRoutes from './modules/terminals/terminals.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import branchesRoutes from './modules/branches/brances.routes';
import auditRoutes from './modules/audit/audit.routes';
import barcodeRoutes from './modules/barcode/barcode.routes';
import { notFoundHandler } from './shared/middlewares/not-found.middleware';
import { requireAuth } from './shared/middlewares/auth.middleware';
import { allowRoles } from './shared/middlewares/role.middleware';
import { requireModule } from './shared/middlewares/permission.middleware';



dotenv.config();

const app: Application = express();

// Configuración de Motor de Vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares

app.use(express.static(path.join(__dirname, '../public'))) // Servir CSS/JS estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Para leer cookie de la sesión

app.use((req, res, next) => {
    console.log(`📡 Petición recibida: ${req.method} ${req.url}`);
    next();
});

// Ruta Base - Redirige al home si está autenticado, sino al login
app.get('/', (req: Request, res: Response) => {
    if (req.cookies.auth_token) {
        res.redirect('/home');
    } else {
        res.redirect('/login');
    }
});

// 1. Rutas Públicas
app.get('/login', authController.showLogin);
app.post('/login', authController.login);
app.get('/logout', authController.logout);

// 2. Rutas Protegidas (VISTAS)
// Home/Menu Principal: Admin y Analista
app.use('/home', requireAuth, allowRoles(['admin', 'analista']), homeRoutes);

// Dashboard: Todos suelen tener acceso, pero lo protegemos igual
app.use('/dashboard', requireAuth, requireModule('dashboard'), dashboardRoutes);

// Terminales
app.use('/terminals', requireAuth, requireModule('terminals'), terminalsRoutes);

// Usuarios (Típicamente solo Admin, pero si un día quieres un "Gestor de Usuarios", solo le das el módulo)
app.use('/users', requireAuth, requireModule('users'), usersRoutes);

// Sucursales
app.use('/branches', requireAuth, requireModule('branches'), branchesRoutes);

// Auditoría
app.use('/audit', requireAuth, requireModule('audit'), auditRoutes);

// Barcode
app.use('/barcode', requireAuth, requireModule('barcode'), barcodeRoutes);

// Manejo de Rutas No Encontradas
app.use(notFoundHandler);

// Manejo de Errores Tipado
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor TS corriendo en puerto ${PORT}`);
    console.log(`🌐 URL del Servidor: http://localhost:${PORT}`);
});