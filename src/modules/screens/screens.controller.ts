import { Request, Response } from 'express';
import * as screensService from './screens.service';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { mainDbPool } from '../../shared/db/main.db';
import { getLocalIpAddress } from '../../shared/utils/get-ip';

export const index = async (req: Request, res: Response) => {
    try {
        const screens = await screensService.getAll();
        const mediaPathVideos = path.join(__dirname, '../../../public/media/videos');
        const mediaPathRoot = path.join(__dirname, '../../../public/media');
        let mediaFiles: string[] = [];

        // Helper to get video files
        const getVideoFiles = (dir: string) => {
            if (fs.existsSync(dir)) {
                return fs.readdirSync(dir).filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.webm', '.mkv', '.avi', '.mov'].includes(ext);
                });
            }
            return [];
        };

        // Get files from both locations
        const videosInSubdir = getVideoFiles(mediaPathVideos);
        const videosInRoot = getVideoFiles(mediaPathRoot);

        // Combine and deduplicate
        mediaFiles = [...new Set([...videosInSubdir, ...videosInRoot])];

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
    const { id, url } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        // Get screen to check type and ensure IP logic
        const [screens] = await mainDbPool.query('SELECT * FROM branch_screens WHERE id = ?', [id]);
        const screen = (screens as any[])[0];

        if (!screen) {
            return res.status(404).json({ success: false, message: 'Pantalla no encontrada' });
        }

        // Sanitizar URL: Reemplazar localhost por IP real de la red
        let targetUrl = url;
        const localIp = getLocalIpAddress();

        if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
            // Reconstruct URL with real IP
            const urlObj = new URL(targetUrl);
            urlObj.hostname = localIp;
            urlObj.port = process.env.PORT || '3000'; // Ensure port matches
            targetUrl = urlObj.toString();
        }

        console.log(`🚀 Sending Play Command to Screen ${id} (${screen.name}): ${targetUrl}`);

        // Logic based on screen name/brand
        if (screen.name.toLowerCase().includes('lg') || (screen.device_type === 'browser' && screen.client_token)) {
            await screensService.openLGBrowser(Number(id), targetUrl);
        } else {
            // Fallback for Samsung/Generic (assuming openSamsungBrowser or similar exists, or log error)
            // If we don't have samsung service imported here generally, we might need to check imports.
            // For now, let's assume this endpoint was mainly hijacked for LG usage in this context, 
            // but if user has Samsung, we should try samsung control or fail gracefully.
            // Since previous code forced LG, we stick to LG if ambiguous, or try generic.
            console.log('Detectada pantalla no-LG, intentando método LG por defecto o fallando...');
            await screensService.openLGBrowser(Number(id), targetUrl);
        }

        res.json({ success: true, message: `Abriendo navegador en pantalla ${id} con URL: ${targetUrl}` });
    } catch (error: any) {
        console.error('Error in playVideo:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const stopVideo = async (req: Request, res: Response) => {
    const { id } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }
        // Launch Home app to "stop" video/browser
        await screensService.launchApp(Number(id), 'com.webos.app.home');
        res.json({ success: true, message: `Reproducción detenida (Home) en ${id}` });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createScreen = async (req: Request, res: Response) => {
    try {
        const { name, device_type, ip_address, mac_address, branch_id } = req.body;
        await screensService.create({
            name,
            device_type,
            ip_address,
            mac_address,
            branch_id: Number(branch_id) || 1,
            is_active: 1 // New screens are active by default
        });
        res.json({ success: true, message: 'Pantalla creada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear pantalla' });
    }
};

export const updateScreen = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, device_type, ip_address, mac_address, branch_id } = req.body;

        // Solo incluir campos que fueron enviados
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (device_type !== undefined) updateData.device_type = device_type;
        if (ip_address !== undefined) updateData.ip_address = ip_address;
        if (mac_address !== undefined) updateData.mac_address = mac_address;
        if (branch_id !== undefined) updateData.branch_id = Number(branch_id);

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

/**
 * Player viewer page - Real-time playback monitoring
 */
export const playerViewer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const screen = await screensService.getById(Number(id));

        if (!screen) {
            return res.status(404).render('error', {
                message: 'Pantalla no encontrada',
                error: { status: 404 }
            });
        }

        // Get available videos for debug/info
        const mediaPathVideos = path.join(__dirname, '../../../public/media/videos');
        let mediaFiles: string[] = [];

        if (fs.existsSync(mediaPathVideos)) {
            mediaFiles = fs.readdirSync(mediaPathVideos).filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp4', '.webm', '.mkv', '.avi', '.mov'].includes(ext);
            });
        }

        res.render('screens/player-viewer', {
            screen,
            title: `Player Viewer - ${screen.name}`,
            mediaFiles
        });
    } catch (error) {
        console.error('Error rendering player viewer:', error);
        res.status(500).render('error', {
            message: 'Error al cargar el visor del reproductor',
            error: { status: 500 }
        });
    }
};

/**
 * Check DLNA device status
 */
/**
 * Check DLNA device status (Now checking LG Connectivity)
 */
export const checkDLNAStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        // For now, we assume offline if we can't easily check without full connection
        // You might want to implement a simple ping to port 3001 here later
        res.json({ online: false, message: 'Status check not implemented for LG yet' });
    } catch (error) {
        res.json({ online: false });
    }
};

// ==========================================
// SAMSUNG TV CONTROL ENDPOINTS
// ==========================================

/**
 * Control de encendido/apagado del TV (Samsung y DLNA)
 */
export const controlPower = async (req: Request, res: Response) => {
    try {
        const { id, action } = req.body;

        if (!id || !action) {
            return res.status(400).json({ success: false, message: 'ID y acción son requeridos' });
        }

        // Get screen info to determine device type
        const [screens] = await mainDbPool.query('SELECT * FROM branch_screens WHERE id = ?', [id]);
        const screen = (screens as any[])[0];

        if (!screen) {
            return res.status(404).json({ success: false, message: 'Pantalla no encontrada' });
        }

        if (action === 'on') {
            const viewerUrl = `${req.protocol}://${req.get('host')}/screens/viewer/${id}`;

            // For both Browser and DLNA types, if it's LG (which DLNA now assumes), run LG Routine
            if (screen.device_type === 'browser' && !screen.name.toLowerCase().includes('lg')) {
                // Samsung TV Routine
                screensService.startRoutine(Number(id))
                    .catch(err => console.error(`Error en rutina Samsung ${id}:`, err));
                res.json({ success: true, message: 'Iniciando secuencia Samsung...' });
            } else {
                // LG TV Routine (Default for DLNA type now)
                screensService.startupRoutineLG(Number(id), viewerUrl)
                    .catch(err => console.error(`Error en rutina LG ${id}:`, err));
                res.json({ success: true, message: 'Iniciando secuencia LG (WoL + Navegador)...' });
            }
        } else if (action === 'off') {
            if (screen.device_type === 'browser' && !screen.name.toLowerCase().includes('lg')) {
                // Samsung
                await screensService.sendSamsungCommand(Number(id), 'KEY_POWER');
                res.json({ success: true, message: 'Comando de apagado enviado (Samsung)' });
            } else {
                // LG (and DLNA/Default)
                await screensService.turnOffLG(Number(id));
                res.json({ success: true, message: 'Comando de apagado enviado (LG)' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Acción inválida. Usa "on" o "off"' });
        }
    } catch (error: any) {
        console.error('Error en controlPower:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al controlar el dispositivo' });
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
            hasToken: !!screen.client_token
        });
    } catch (error: any) {
        console.error('Error en pairDevice:', error);
        res.status(500).json({ success: false, message: error.message || 'Error al emparejar el TV' });
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

// ============================================
// LG TV Control Endpoints
// ============================================

/**
 * Validate LG TV connection and get token
 */
export const validateLGConnection = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const token = await screensService.validateLGConnection(Number(id));

        res.json({
            success: true,
            message: 'Conexión validada. Acepta el emparejamiento en el TV si aparece.',
            token,
            hasToken: !!token
        });
    } catch (error: any) {
        console.error('Error en validateLGConnection:', error);
        res.status(500).json({ success: false, message: error.message || 'Error validando conexión' });
    }
};

/**
 * Open URL in LG TV browser
 */
export const openLGBrowser = async (req: Request, res: Response) => {
    try {
        const { id, url } = req.body;

        if (!id || !url) {
            return res.status(400).json({ success: false, message: 'ID y URL son requeridos' });
        }

        await screensService.openLGBrowser(Number(id), url);

        res.json({ success: true, message: 'Navegador abierto en LG TV' });
    } catch (error: any) {
        console.error('Error en openLGBrowser:', error);
        res.status(500).json({ success: false, message: error.message || 'Error abriendo navegador' });
    }
};

/**
 * Cast video playlist to LG TV
 */
export const castLGContent = async (req: Request, res: Response) => {
    try {
        const { id, playlist, loop } = req.body;

        if (!id || !playlist || !Array.isArray(playlist)) {
            return res.status(400).json({ success: false, message: 'ID y playlist son requeridos' });
        }

        const serverUrl = `${req.protocol}://${req.get('host')}`;
        await screensService.castContent(Number(id), playlist, loop === true, serverUrl);

        res.json({
            success: true,
            message: `Reproduciendo ${playlist.length} video(s) en LG TV`
        });
    } catch (error: any) {
        console.error('Error en castLGContent:', error);
        res.status(500).json({ success: false, message: error.message || 'Error reproduciendo contenido' });
    }
};

/**
 * Turn off LG TV
 */
export const turnOffLG = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        await screensService.turnOffLG(Number(id));

        res.json({ success: true, message: 'LG TV apagado' });
    } catch (error: any) {
        console.error('Error en turnOffLG:', error);
        res.status(500).json({ success: false, message: error.message || 'Error apagando TV' });
    }
};

/**
 * Wake LG TV using Wake-on-LAN
 */
export const wakeLG = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        await screensService.wakeOnLanLG(Number(id));

        res.json({ success: true, message: 'Señal Wake-on-LAN enviada' });
    } catch (error: any) {
        console.error('Error en wakeLG:', error);
        res.status(500).json({ success: false, message: error.message || 'Error enviando Wake-on-LAN' });
    }
};

/**
 * Send toast notification to LG TV
 */
export const sendLGToast = async (req: Request, res: Response) => {
    try {
        const { id, message } = req.body;

        if (!id || !message) {
            return res.status(400).json({ success: false, message: 'ID y mensaje son requeridos' });
        }

        await screensService.sendToast(Number(id), message);

        res.json({ success: true, message: 'Notificación enviada' });
    } catch (error: any) {
        console.error('Error en sendLGToast:', error);
        res.status(500).json({ success: false, message: error.message || 'Error enviando notificación' });
    }
};

/**
 * Get LG TV system info
 */
export const getLGSystemInfo = async (req: Request, res: Response) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const info = await screensService.getSystemInfo(Number(id));

        res.json({ success: true, info });
    } catch (error: any) {
        console.error('Error en getLGSystemInfo:', error);
        res.status(500).json({ success: false, message: error.message || 'Error obteniendo información' });
    }
};

/**
 * LG TV startup routine (Wake + Open Browser)
 */
export const startupRoutineLG = async (req: Request, res: Response) => {
    try {
        const { id, url } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const targetUrl = url || `${req.protocol}://${req.get('host')}/proxy/`;
        await screensService.startupRoutineLG(Number(id), targetUrl);

        res.json({ success: true, message: 'Rutina de encendido completada' });
    } catch (error: any) {
        console.error('Error en startupRoutineLG:', error);
        res.status(500).json({ success: false, message: error.message || 'Error en rutina de encendido' });
    }
};

/**
 * Send remote control key to LG TV
 */
export const sendLGRemoteKey = async (req: Request, res: Response) => {
    try {
        const { id, key } = req.body;

        if (!id || !key) {
            return res.status(400).json({ success: false, message: 'ID y tecla son requeridos' });
        }

        await screensService.sendRemoteKey(Number(id), key);

        res.json({ success: true, message: `Tecla ${key} enviada` });
    } catch (error: any) {
        console.error('Error en sendLGRemoteKey:', error);
        res.status(500).json({ success: false, message: error.message || 'Error enviando tecla' });
    }
};

/**
 * Get LG TV volume
 */
export const getLGVolume = async (req: Request, res: Response) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const volume = await screensService.getVolume(Number(id));

        res.json({ success: true, volume });
    } catch (error: any) {
        console.error('Error en getLGVolume:', error);
        res.status(500).json({ success: false, message: error.message || 'Error obteniendo volumen' });
    }
};

/**
 * Set LG TV volume
 */
export const setLGVolume = async (req: Request, res: Response) => {
    try {
        const { id, volume } = req.body;

        if (!id || volume === undefined) {
            return res.status(400).json({ success: false, message: 'ID y volumen son requeridos' });
        }

        await screensService.setVolume(Number(id), Number(volume));

        res.json({ success: true, message: 'Volumen ajustado' });
    } catch (error: any) {
        console.error('Error en setLGVolume:', error);
        res.status(500).json({ success: false, message: error.message || 'Error ajustando volumen' });
    }
};

/**
 * Mute/Unmute LG TV
 */
export const setLGMute = async (req: Request, res: Response) => {
    try {
        const { id, mute } = req.body;

        if (!id || mute === undefined) {
            return res.status(400).json({ success: false, message: 'ID y estado de mute son requeridos' });
        }

        await screensService.setMute(Number(id), Boolean(mute));

        res.json({ success: true, message: mute ? 'Silenciado' : 'Audio activado' });
    } catch (error: any) {
        console.error('Error en setLGMute:', error);
        res.status(500).json({ success: false, message: error.message || 'Error cambiando mute' });
    }
};

/**
 * Get LG TV apps list
 */
export const getLGApps = async (req: Request, res: Response) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID es requerido' });
        }

        const apps = await screensService.getApps(Number(id));

        res.json({ success: true, apps });
    } catch (error: any) {
        console.error('Error en getLGApps:', error);
        res.status(500).json({ success: false, message: error.message || 'Error obteniendo apps' });
    }
};

/**
 * Launch app on LG TV
 */
export const launchLGApp = async (req: Request, res: Response) => {
    try {
        const { id, appId } = req.body;

        if (!id || !appId) {
            return res.status(400).json({ success: false, message: 'ID y appId son requeridos' });
        }

        await screensService.launchApp(Number(id), appId);

        res.json({ success: true, message: 'App lanzada' });
    } catch (error: any) {
        console.error('Error en launchLGApp:', error);
        res.status(500).json({ success: false, message: error.message || 'Error lanzando app' });
    }
};
