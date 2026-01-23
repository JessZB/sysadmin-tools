import { mainDbPool } from '../../shared/db/main.db';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MediaRendererClient = require('upnp-mediarenderer-client');

export interface Screen {
    id: number;
    name: string;
    ip_address?: string;
    device_type: 'dlna' | 'browser';
    socket_id?: string;
    is_active: number;
    created_at: Date;
    mac_address?: string;
    samsung_token?: string;
}

export const getAll = async (): Promise<Screen[]> => {
    const [rows] = await mainDbPool.query('SELECT * FROM branch_screens WHERE is_active = 1');
    return rows as Screen[];
};

export const create = async (data: Partial<Screen>) => {
    await mainDbPool.query('INSERT INTO branch_screens SET ?', [data]);
};

export const update = async (id: number, data: Partial<Screen>) => {
    await mainDbPool.query('UPDATE branch_screens SET ? WHERE id = ?', [data, id]);
};

export const deleteScreen = async (id: number) => {
    await mainDbPool.query('DELETE FROM branch_screens WHERE id = ?', [id]);
};

export const getById = async (id: number): Promise<Screen | null> => {
    const [rows] = await mainDbPool.query('SELECT * FROM branch_screens WHERE id = ?', [id]);
    const screens = rows as Screen[];
    return screens.length > 0 ? screens[0] : null;
};

export const updateSocketId = async (id: number, socketId: string) => {
    await mainDbPool.query('UPDATE branch_screens SET socket_id = ? WHERE id = ?', [socketId, id]);
};

// ==========================================
// SAMSUNG TV CONTROL METHODS (WebSocket)
// ==========================================

// Import WebSocket-based Samsung functions
export {
    validateSamsungConnection,
    sendSamsungCommand,
    openSamsungBrowser,
    wakeOnLan,
    registerToken
} from './samsung-websocket';

// Import startup routine
export { startRoutine } from './samsung-startup-routine';

// ==========================================
// DLNA CONTROL METHODS
// ==========================================

export const castVideo = async (ip: string, url: string) => {
    return new Promise<void>((resolve, reject) => {
        const client = new MediaRendererClient(`http://${ip}:9197/dmr`);

        client.load(url, { autoplay: true }, (err: any) => {
            if (err) return reject(err);
            client.play((err: any) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
};

export const stopVideo = async (ip: string) => {
    return new Promise<void>((resolve, reject) => {
        const client = new MediaRendererClient(`http://${ip}:9197/dmr`);
        client.stop((err: any) => {
            if (err) return reject(err);
            resolve();
        });
    });
};
