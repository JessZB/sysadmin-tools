import { mainDbPool } from '../../shared/db/main.db';
// eslint-disable-next-line @typescript-eslint/no-var-requires


export interface Screen {
    id: number;
    name: string;
    ip_address?: string;
    device_type: 'dlna' | 'browser';
    socket_id?: string;
    is_active: number;
    created_at: Date;
    mac_address?: string;
    client_token?: string;
    branch_id?: number;
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
    const screens = rows as any[];

    if (screens.length > 0) {
        const screen = screens[0];
        // Fallback for legacy database schema (samsung_token -> client_token)
        if (screen.samsung_token && !screen.client_token) {
            screen.client_token = screen.samsung_token;
        }
        return screen as Screen;
    }
    return null;
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
// LG TV CONTROL METHODS (WebSocket)
// ==========================================

export {
    validateLGConnection,
    openLGBrowser,
    castContent,
    turnOffLG,
    wakeOnLanLG,
    sendToast,
    getSystemInfo,
    startupRoutineLG,
    sendRemoteKey,
    getVolume,
    setVolume,
    setMute,
    getApps,
    launchApp
} from './lg-websocket';

// ==========================================
// DEPRECATED DLNA METHODS REMOVED
// ==========================================
