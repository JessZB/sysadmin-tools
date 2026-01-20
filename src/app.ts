import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { IncomingMessage, ServerResponse } from 'http';

import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express, { Application, Request, Response, NextFunction } from 'express';

import * as authController from './modules/auth/auth.controller';
import homeRoutes from './modules/home/home.routes';
import usersRoutes from './modules/users/users.routes';
import terminalsRoutes from './modules/terminals/terminals.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import branchesRoutes from './modules/branches/brances.routes';
import auditRoutes from './modules/audit/audit.routes';
import barcodeRoutes from './modules/barcode/barcode.routes';
import servicesRoutes from './modules/services/services.routes';
import screensRoutes from './modules/screens/screens.routes';
import { notFoundHandler } from './shared/middlewares/not-found.middleware';
import { requireAuth } from './shared/middlewares/auth.middleware';
import { allowRoles } from './shared/middlewares/role.middleware';
import { requireModule } from './shared/middlewares/permission.middleware';
import { cleanExpiredCache } from './modules/terminals/currency.service';



dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado a Socket.io:', socket.id);

    socket.on('register-screen', (screenId) => {
        console.log(`📺 Pantalla registrada: ${screenId} (Socket: ${socket.id})`);
        socket.join('screen_' + screenId);
    });

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// Configuración de Motor de Vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares

// Proxy para contenido externo (evita CORS y X-Frame-Options)
app.use('/proxy', createProxyMiddleware({
    target: 'http://10.1.100.249:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy': '',
    },
    selfHandleResponse: true,
    on: {
        proxyRes: (proxyRes: IncomingMessage, req: Request, res: Response) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];

            const contentType = proxyRes.headers['content-type'] || '';

            // Si es HTML, modificar las URLs
            if (contentType.includes('text/html')) {
                let body = '';
                proxyRes.setEncoding('utf8');

                proxyRes.on('data', (chunk) => {
                    body += chunk;
                });

                proxyRes.on('end', () => {
                    // Reemplazar URLs para que pasen por el proxy
                    body = body.replace(/http:\/\/localhost:4000\//g, '/proxy/');
                    body = body.replace(/href="\/static\//g, 'href="/proxy/static/');
                    body = body.replace(/src="\/static\//g, 'src="/proxy/static/');
                    body = body.replace(/href="\/favicon\./g, 'href="/proxy/favicon.');
                    body = body.replace(/src="\/socket\.io\//g, 'src="/proxy/socket.io/');
                    body = body.replace(/url\(\/static\//g, 'url(/proxy/static/');

                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Content-Length', Buffer.byteLength(body));
                    res.end(body);
                });
            } else {
                // Para otros tipos de contenido, solo pasar los datos
                Object.keys(proxyRes.headers).forEach(key => {
                    res.setHeader(key, proxyRes.headers[key]!);
                });
                res.statusCode = proxyRes.statusCode || 200;
                proxyRes.pipe(res);
            }
        },
    },
}));

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

// Monitoreo de Servicios
app.use('/services', requireAuth, requireModule('services'), servicesRoutes);

// Pantallas
app.use('/screens', screensRoutes);

// Manejo de Rutas No Encontradas
app.use(notFoundHandler);

// Manejo de Errores Tipado
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor TS corriendo en puerto ${PORT}`);
    console.log(`🌐 URL del Servidor: http://localhost:${PORT}`);

    // Iniciar limpieza automática del caché de tasas de cambio cada 15 minutos
    setInterval(() => {
        cleanExpiredCache();
    }, 15 * 60 * 1000); // 15 minutos

    console.log('🧹 Limpieza automática de caché iniciada (cada 15 minutos)');
});