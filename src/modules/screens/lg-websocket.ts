// eslint-disable-next-line @typescript-eslint/no-var-requires
const lgtv = require('lgtv2');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const wol = require('wake_on_lan');
import { mainDbPool } from '../../shared/db/main.db';
import { getById } from '../screens/screens.service';
import * as mediaService from '../media/media.service';

// Disable TLS certificate validation for LG TVs (self-signed certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface LGScreen {
    id: number;
    name: string;
    ip_address?: string;
    mac_address?: string;
    client_token?: string;
}

interface LGTVClient {
    connected: boolean;
    request: (command: string, params?: any, callback?: (err: any, res?: any) => void) => void;
    disconnect: () => void;
}

/**
 * Create LG TV WebSocket connection
 */
export const createLGConnection = (ip: string, port: number = 3001, token?: string): Promise<LGTVClient> => {
    return new Promise((resolve, reject) => {
        const url = `wss://${ip}:${port}`;

        console.log(`🔌 Connecting to LG TV at ${url}...`);

        const client = lgtv({
            url,
            timeout: 5000,
            reconnect: false,
            clientKey: token || null,
            saveKey: (key: string, cb: (err: any) => void) => {
                console.log(`🔐 New LG TV token received: ${key}`);
                cb(null);
            }
        }) as LGTVClient;

        const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
        }, 10000);

        client.request = client.request || (() => { });

        const originalRequest = client.request.bind(client);
        client.request = (command: string, params?: any, callback?: (err: any, res?: any) => void) => {
            if (!client.connected) {
                if (callback) callback(new Error('Not connected'));
                return;
            }
            originalRequest(command, params, callback);
        };

        (client as any).on('connect', () => {
            clearTimeout(timeout);
            console.log('✅ Connected to LG TV');
            resolve(client);
        });

        (client as any).on('error', (err: Error) => {
            clearTimeout(timeout);
            console.error('❌ LG TV connection error:', err.message);
            reject(err);
        });
    });
};

/**
 * Validate LG TV connection and get/update token
 */
export const validateLGConnection = async (id: number): Promise<string> => {
    const screen = await getById(id) as LGScreen;

    if (!screen || !screen.ip_address) {
        throw new Error('Screen not found or missing IP address');
    }

    console.log(`🔍 Validating LG TV connection for screen ${id}...`);

    let newToken: string | null = null;

    const client = lgtv({
        url: `wss://${screen.ip_address}:3001`,
        timeout: 10000,
        reconnect: false,
        clientKey: null, // Force new pairing
        saveKey: (key: string, cb: (err: any) => void) => {
            console.log(`🔐 New token for screen ${id}: ${key}`);
            newToken = key;
            cb(null);
        }
    });

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            (client as any).disconnect();
            reject(new Error('Validation timeout. Please accept pairing on TV.'));
        }, 15000);

        (client as any).on('connect', async () => {
            clearTimeout(timeout);

            if (newToken) {
                // Save token to database
                await mainDbPool.query(
                    'UPDATE branch_screens SET client_token = ? WHERE id = ?',
                    [newToken, id]
                );
                console.log(`✅ Token saved for screen ${id}`);
            }

            (client as any).disconnect();
            resolve(newToken || screen.client_token || '');
        });

        (client as any).on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
};

/**
 * Send command to LG TV
 */
export const sendLGCommand = async (id: number, command: string, params?: any): Promise<any> => {
    const screen = await getById(id) as LGScreen;

    if (!screen || !screen.ip_address) {
        throw new Error('Screen not found or missing IP address');
    }

    if (!screen.client_token) {
        throw new Error('TV not paired. Please validate connection first.');
    }

    const client = await createLGConnection(screen.ip_address, 3001, screen.client_token);

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            client.disconnect();
            reject(new Error('Command timeout'));
        }, 10000);

        client.request(command, params, (err, res) => {
            clearTimeout(timeout);
            client.disconnect();

            if (err) {
                console.error(`❌ Error sending command ${command}:`, err);
                reject(err);
            } else {
                console.log(`✅ Command ${command} sent successfully`);
                resolve(res);
            }
        });
    });
};

/**
 * Open URL in LG TV browser
 */
export const openLGBrowser = async (id: number, url: string): Promise<void> => {
    console.log(`🌐 Opening URL on LG TV ${id}: ${url}`);
    await sendLGCommand(id, 'ssap://system.launcher/open', { target: url });
};

/**
 * Cast video playlist to LG TV
 */
export const castContent = async (id: number, playlist: string[], loop: boolean, serverUrl: string): Promise<void> => {
    console.log(`📹 Casting playlist to LG TV ${id}:`, playlist);

    const playerUrl = mediaService.getPlayerUrl(serverUrl, playlist, loop);
    console.log(`🎬 Player URL: ${playerUrl}`);

    await openLGBrowser(id, playerUrl);
};

/**
 * Turn off LG TV
 */
export const turnOffLG = async (id: number): Promise<void> => {
    console.log(`💤 Turning off LG TV ${id}`);
    await sendLGCommand(id, 'ssap://system/turnOff');
};

/**
 * Send toast notification to LG TV
 */
export const sendToast = async (id: number, message: string): Promise<void> => {
    console.log(`📨 Sending toast to LG TV ${id}: ${message}`);
    await sendLGCommand(id, 'ssap://system.notifications/createToast', { message });
};

/**
 * Get LG TV system info
 */
export const getSystemInfo = async (id: number): Promise<any> => {
    console.log(`ℹ️ Getting system info for LG TV ${id}`);
    return await sendLGCommand(id, 'ssap://system/getSystemInfo');
};

/**
 * Wake LG TV using Wake-on-LAN
 */
export const wakeOnLanLG = async (id: number): Promise<void> => {
    const screen = await getById(id) as LGScreen;

    if (!screen || !screen.mac_address) {
        throw new Error('Screen not found or missing MAC address');
    }

    console.log(`⚡ Sending Wake-on-LAN to ${screen.mac_address}`);

    return new Promise((resolve, reject) => {
        wol.wake(screen.mac_address!, (err: any) => {
            if (err) {
                console.error('❌ Wake-on-LAN error:', err);
                reject(err);
            } else {
                console.log('✅ Wake-on-LAN signal sent');
                // Send again after 300ms for reliability
                setTimeout(() => {
                    wol.wake(screen.mac_address!);
                }, 300);
                resolve();
            }
        });
    });
};

/**
 * Startup routine: Wake TV, wait, then open browser
 */
export const startupRoutineLG = async (id: number, url: string): Promise<void> => {
    console.log(`🚀 Starting LG TV startup routine for screen ${id}`);

    // Step 1: Wake TV
    await wakeOnLanLG(id);

    // Step 2: Wait for TV to boot (15 seconds)
    console.log('⏳ Waiting 15 seconds for TV to boot...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Step 3: Open browser
    console.log('🌐 Opening browser...');
    await openLGBrowser(id, url);

    console.log('✅ Startup routine completed');
};
