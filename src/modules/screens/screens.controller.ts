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
        if (fs.existsSync(mediaPath)) {
            mediaFiles = fs.readdirSync(mediaPath);
        }
        res.render('screens/list', { screens, mediaFiles });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener pantallas');
    }
};

export const viewer = (req: Request, res: Response) => {
    const screenId = req.params.id;
    // Usar proxy para evitar problemas de CORS y X-Frame-Options
    const targetUrl = '/proxy/';
    res.render('screens/viewer_layout', { screenId, targetUrl });
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
