import path from 'path';

import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';

import * as authController from './modules/auth/auth.controller';
import usersRoutes from './modules/users/users.routes';
import terminalsRoutes from './modules/terminals/terminals.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import branchesRoutes from './modules/branches/brances.routes';
import { requireAuth } from './shared/middlewares/auth.middleware';
import { notFoundHandler } from './shared/middlewares/not-found.middleware';



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

// Ruta Base
app.get('/', (req: Request, res: Response) => {
    res.redirect('/login');
});

// 1. Rutas Públicas
app.get('/login', authController.showLogin);
app.post('/login', authController.login);
app.get('/logout', authController.logout);

// 2. Rutas Protegidas (VISTAS)
app.use('/terminals', requireAuth, terminalsRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/branches', requireAuth, branchesRoutes);

// 3. Rutas Protegidas (API)
app.use('/users', requireAuth, usersRoutes);

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