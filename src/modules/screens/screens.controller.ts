import { Request, Response } from 'express';
import * as screensService from './screens.service';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';

export const index = async (req: Request, res: Response) => {
    try {
        const screens = await screensService.getAll();
        const mediaPath = path.join(__dirname, '../../../../public/media');
        let mediaFiles: string[] = [];

        // Crear directorio si no existe
        if (!fs.existsSync(mediaPath)) {
            fs.mkdirSync(mediaPath, { recursive: true });
        } else {
            mediaFiles = fs.readdirSync(mediaPath);
        }

        res.render('screens/list', {
            page: 'screens',
            user: res.locals.user,
            screens,
            mediaFiles,
            script: 'screens.client.js'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar vista de pantallas');
    }
};

export const viewer = (req: Request, res: Response) => {
    const screenId = req.params.id;
    // URL desde variable de entorno
    const targetUrl = process.env.SCREEN_TARGET_URL || '/proxy/';
    res.render('screens/viewer_layout', { screenId, targetUrl });
};

export const registerSocket = async (req: Request, res: Response) => {
    try {
        const { screenId, socketId } = req.body;
        await screensService.updateSocketId(Number(screenId), socketId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar socket' });
    }
};

export const reloadScreen = (req: Request, res: Response) => {
    const { id } = req.body;
    const io: Server = req.app.get('socketio');

    if (io) {
        io.to('screen_' + id).emit('force-reload');
        res.json({ success: true, message: `Recarga enviada a pantalla ${id}` });
    } else {
        res.status(500).json({ success: false, message: 'Socket.io no inicializado' });
    }
};

export const playVideo = async (req: Request, res: Response) => {
    const { ip, url } = req.body;
    try {
        await screensService.castVideo(ip, url);
        res.json({ success: true, message: `Reproduciendo en ${ip}` });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createScreen = async (req: Request, res: Response) => {
    try {
        const { name, device_type, ip_address, is_active } = req.body;
        await screensService.create({ name, device_type, ip_address, is_active: Number(is_active) });
        res.json({ success: true, message: 'Pantalla creada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear pantalla' });
    }
};

export const updateScreen = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, device_type, ip_address, is_active, mac_address } = req.body;

        // Solo incluir campos que fueron enviados
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (device_type !== undefined) updateData.device_type = device_type;
        if (ip_address !== undefined) updateData.ip_address = ip_address;
        if (is_active !== undefined) updateData.is_active = Number(is_active);
        if (mac_address !== undefined) updateData.mac_address = mac_address;

        await screensService.update(Number(id), updateData);
        res.json({ success: true, message: 'Pantalla actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar pantalla' });
    }
};

export const deleteScreenById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await screensService.deleteScreen(Number(id));
        res.json({ success: true, message: 'Pantalla eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar pantalla' });
    }
};

export const getScreenById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const screen = await screensService.getById(Number(id));
        if (!screen) {
            return res.status(404).json({ success: false, message: 'Pantalla no encontrada' });
        }
        res.json({ success: true, data: screen });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener pantalla' });
    }
};

// ==========================================
// SAMSUNG TV CONTROL ENDPOINTS
// ==========================================

/**
 * Control de encendido/apagado del TV Samsung
 */
export const controlPower = async (req: Request, res: Response) => {
    try {
        const { id, action } = req.body;

        if (!id || !action) {
            return res.status(400).json({ success: false, message: 'ID y acción son requeridos' });
        }

        if (action === 'on') {
            await screensService.wakeOnLan(Number(id));
            res.json({ success: true, message: 'Señal de encendido enviada. El TV puede tardar unos segundos en encender.' });
        } else if (action === 'off') {
            await screensService.sendSamsungCommand(Number(id), 'KEY_POWER');
            res.json({ success: true, message: 'Comando de apagado enviado' });
        } else {
            res.status(400).json({ success: false, message: 'Acción inválida. Usa "on" o "off"' });
        }
    } catch (error: any) {
        console.error('Error en controlPower:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al controlar el TV' });
    }
};

/**
 * Control de silencio (mute) del TV Samsung
 */
export const controlMute = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        await screensService.sendSamsungCommand(Number(id), 'KEY_MUTE');
        res.json({ success: true, message: 'Comando de silencio enviado' });
    } catch (error: any) {
        console.error('Error en controlMute:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al silenciar el TV' });
    }
};

/**
 * Iniciar proceso de emparejamiento con TV Samsung (opcional)
 */
export const pairDevice = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        // El emparejamiento se hace automáticamente en el primer intento de conexión
        // Este endpoint es opcional y puede usarse para forzar un nuevo emparejamiento
        const screen = await screensService.getById(Number(id));

        if (!screen) {
            return res.status(404).json({ success: false, message: 'Pantalla no encontrada' });
        }

        res.json({
            success: true,
            message: 'El emparejamiento se realizará automáticamente en el próximo comando. Acepta la solicitud en el TV.',
            hasToken: !!screen.samsung_token
        });
    } catch (error: any) {
        console.error('Error en pairDevice:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al emparejar el TV' });
    }
};
/**
 * Rutina de encendido automático
 */
export const startupRoutine = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        console.log(`🚀 Iniciando rutina de encendido para pantalla ${id}`);

        // Ejecutar rutina en segundo plano
        screensService.startRoutine(Number(id))
            .then(() => {
                console.log(`✅ Rutina completada para pantalla ${id}`);
            })
            .catch((error) => {
                console.error(`❌ Error en rutina para pantalla ${id}:`, error);
            });

        // Responder inmediatamente al cliente
        res.json({
            success: true,
            message: 'Rutina iniciada. El TV encenderá y abrirá el navegador en ~15 segundos.'
        });

    } catch (error: any) {
        console.error('Error en startupRoutine:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al iniciar rutina' });
    }
};
/**
 * Validar conexión y obtener token
 */
export const validateConnection = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const token = await screensService.validateSamsungConnection(Number(id));

        res.json({
            success: true,
            message: 'Conexión validada correctamente',
            token: token.substring(0, 10) + '...' // Mostrar solo parte del token
        });
    } catch (error: any) {
        console.error('Error en validateConnection:', error);
        res.status(500).json({ success: false, message: error.message || 'Error validando conexión' });
    }
};

/**
 * Enviar comando específico al TV
 */
export const sendKey = async (req: Request, res: Response) => {
    try {
        const { id, key } = req.body;

        if (!id || !key) {
            return res.status(400).json({ success: false, message: 'ID y tecla son requeridos' });
        }

        await screensService.sendSamsungCommand(Number(id), key);

        res.json({ success: true, message: `Comando ${key} enviado` });
    } catch (error: any) {
        console.error('Error en sendKey:', error);
        res.status(500).json({ success: false, message: error.message || 'Error enviando comando' });
    }
};

/**
 * Abrir navegador en el TV
 */
export const openBrowser = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        await screensService.openSamsungBrowser(Number(id));

        res.json({ success: true, message: 'Navegador abierto' });
    } catch (error: any) {
        console.error('Error en openBrowser:', error);
        res.status(500).json({ success: false, message: error.message || 'Error abriendo navegador' });
    }
};



