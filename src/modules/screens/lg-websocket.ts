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
export const createLGConnection = (ip: string, port: number = 3001, token?: string, screenId?: number): Promise<LGTVClient> => {
    return new Promise((resolve, reject) => {
        const url = `wss://${ip}:${port}`;

        console.log(`🔌 Connecting to LG TV at ${url}...`);

        const client = lgtv({
            url,
            timeout: 5000,
            reconnect: false,
            clientKey: token || null,
            saveKey: async (key: string, cb: (err: any) => void) => {
                console.log(`🔐 New LG TV token received: ${key}`);

                if (screenId) {
                    try {
                        await mainDbPool.query(
                            'UPDATE branch_screens SET client_token = ? WHERE id = ?',
                            [key, screenId]
                        );
                        console.log(`✅ Token automatically updated in DB for screen ${screenId}`);
                    } catch (e) {
                        console.warn('Failed to update client_token, trying samsung_token (legacy)...');
                        try {
                            await mainDbPool.query(
                                'UPDATE branch_screens SET samsung_token = ? WHERE id = ?',
                                [key, screenId]
                            );
                            console.log(`✅ Token updated in DB (legacy samsung_token) for screen ${screenId}`);
                        } catch (e2) {
                            console.error('Error saving new token:', e);
                        }
                    }
                }

                cb(null);
            }
        }) as LGTVClient;

        const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
        }, 10000);

        // Remove defensive wrapper that causes 'Not connected' errors during token renewal
        // client.request is handled natively by lgtv2

        (client as any).on('connect', async () => {
            clearTimeout(timeout);
            console.log('✅ Connected to LG TV');

            // Wait a bit for connection to stabilize and auth to complete
            await new Promise(r => setTimeout(r, 1000));

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
    let keyResolved = false;

    return new Promise((resolve, reject) => {
        // Overall timeout (increased to 30s for user interaction)
        const overallTimeout = setTimeout(() => {
            if (!keyResolved) {
                try { (client as any).disconnect(); } catch (e) { }
                reject(new Error('Validation timeout or user denied pairing.'));
            }
        }, 30000);

        const client = lgtv({
            url: `wss://${screen.ip_address}:3001`,
            timeout: 10000,
            reconnect: false,
            clientKey: null, // Force new pairing
            saveKey: async (key: string, cb: (err: any) => void) => {
                console.log(`🔐 New token received for screen ${id}: ${key}`);
                newToken = key;
                keyResolved = true;

                try {
                    // Save token immediately
                    await mainDbPool.query(
                        'UPDATE branch_screens SET client_token = ? WHERE id = ?',
                        [key, id]
                    );
                    console.log(`✅ Token explicitly saved to DB for screen ${id}`);
                } catch (dbErr) {
                    console.warn('Failed to update client_token, trying samsung_token (legacy)...');
                    try {
                        await mainDbPool.query(
                            'UPDATE branch_screens SET samsung_token = ? WHERE id = ?',
                            [key, id]
                        );
                        console.log(`✅ Token explicitly saved to DB (legacy samsung_token) for screen ${id}`);
                    } catch (dbErr2) {
                        console.error('❌ Error saving token to DB:', dbErr);
                    }
                }

                cb(null);

                // Cleanup and return success
                clearTimeout(overallTimeout);
                setTimeout(() => {
                    try { (client as any).disconnect(); } catch (e) { }
                    resolve(key);
                }, 500); // Small delay to ensure Ack sent
            }
        });

        (client as any).on('connect', () => {
            console.log('✅ Connected to LG TV (Waiting for pairing/key)...');
            // Do NOT disconnect here. Wait for saveKey.
        });

        (client as any).on('error', (err: Error) => {
            console.error('❌ LG TV connection error during validation:', err.message);
            // Don't reject immediately on transient errors, but if critical...
            // lgtv2 usually emits error on fail.
        });

        (client as any).on('close', () => {
            if (!keyResolved) {
                // Connection closed without key
                console.warn('⚠️ Connection closed without receiving key');
            }
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

    console.log('DEBUG Screen in sendLGCommand:', screen);

    if (!screen.client_token) {
        throw new Error('TV not paired. Please validate connection first.');
    }

    const client = await createLGConnection(screen.ip_address, 3001, screen.client_token, id);

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

/**
 * Send remote control key to LG TV
 * Available keys: POWER, UP, DOWN, LEFT, RIGHT, ENTER, BACK, HOME, MENU, 
 *                 VOLUMEUP, VOLUMEDOWN, MUTE, CHANNELUP, CHANNELDOWN,
 *                 RED, GREEN, YELLOW, BLUE, 0-9, etc.
 */
export const sendRemoteKey = async (id: number, key: string): Promise<void> => {
    console.log(`🎮 Sending remote key to LG TV ${id}: ${key}`);
    await sendLGCommand(id, 'ssap://com.webos.service.ime/sendEnterKey', { key });
};

/**
 * Get current volume level
 */
export const getVolume = async (id: number): Promise<any> => {
    console.log(`🔊 Getting volume for LG TV ${id}`);
    return await sendLGCommand(id, 'ssap://audio/getVolume');
};

/**
 * Set volume level (0-100)
 */
export const setVolume = async (id: number, volume: number): Promise<void> => {
    console.log(`🔊 Setting volume for LG TV ${id} to ${volume}`);
    await sendLGCommand(id, 'ssap://audio/setVolume', { volume });
};

/**
 * Mute/Unmute TV
 */
export const setMute = async (id: number, mute: boolean): Promise<void> => {
    console.log(`🔇 ${mute ? 'Muting' : 'Unmuting'} LG TV ${id}`);
    await sendLGCommand(id, 'ssap://audio/setMute', { mute });
};

/**
 * Get list of installed apps
 */
export const getApps = async (id: number): Promise<any> => {
    console.log(`📱 Getting apps list for LG TV ${id}`);
    return await sendLGCommand(id, 'ssap://com.webos.applicationManager/listApps');
};

/**
 * Launch an app by ID
 */
export const launchApp = async (id: number, appId: string): Promise<void> => {
    console.log(`🚀 Launching app ${appId} on LG TV ${id}`);
    await sendLGCommand(id, 'ssap://system.launcher/launch', { id: appId });
};
