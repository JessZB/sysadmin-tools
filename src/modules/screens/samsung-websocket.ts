// ==========================================
// SAMSUNG TV CONTROL METHODS (WebSocket)
// ==========================================

import WebSocket from 'ws';
import { mainDbPool } from '../../shared/db/main.db';

interface Screen {
    id: number;
    name: string;
    ip_address?: string;
    mac_address?: string;
    client_token?: string;
}

interface WebSocketResult {
    ws: WebSocket;
    token?: string;
}

/**
 * Helper para obtener pantalla por ID
 */
const getById = async (id: number): Promise<Screen | null> => {
    const [rows] = await mainDbPool.query('SELECT * FROM branch_screens WHERE id = ?', [id]);
    const screens = rows as any[];
    if (screens.length > 0) {
        const screen = screens[0];
        if (screen.samsung_token && !screen.client_token) {
            screen.client_token = screen.samsung_token;
        }
        return screen as Screen;
    }
    return null;
};

/**
 * Crear conexión WebSocket con Samsung TV
 */
const createWebSocketConnection = (ip: string, token?: string): Promise<WebSocketResult> => {
    return new Promise((resolve, reject) => {
        const appName = Buffer.from('SysAdmin-Control').toString('base64');
        const url = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${appName}${token ? '&token=' + encodeURIComponent(token) : ''}`;

        if (token) {
            console.log(`🔑 Usando token guardado para conexión: ${token.substring(0, 5)}...`);
        }

        const ws = new WebSocket(url, { rejectUnauthorized: false } as any);
        let capturedToken: string | undefined = token;
        let resolved = false;

        ws.on('open', () => {
            console.log(`✅ WebSocket conectado a ${ip}`);
            // Si ya tenemos token, resolver inmediatamente
            if (token) {
                resolved = true;
                resolve({ ws, token });
            }
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.event === 'ms.channel.connect' && response.data?.token) {
                    capturedToken = response.data.token;
                    console.log(`📝 Token capturado: ${capturedToken}`);
                    if (!resolved) {
                        resolved = true;
                        resolve({ ws, token: capturedToken });
                    }
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        });

        ws.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        // Timeout de 10 segundos
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                ws.close();
                if (capturedToken || token) {
                    resolve({ ws, token: capturedToken || token });
                } else {
                    reject(new Error('Timeout conectando al TV'));
                }
            }
        }, 30000);
    });
};

/**
 * Registrar token de emparejamiento Samsung
 */
export const registerToken = async (id: number, token: string) => {
    try {
        await mainDbPool.query('UPDATE branch_screens SET client_token = ? WHERE id = ?', [token, id]);
    } catch (e) {
        console.warn('Failed to update client_token (Samsung), trying samsung_token (legacy)...');
        await mainDbPool.query('UPDATE branch_screens SET samsung_token = ? WHERE id = ?', [token, id]);
    }
};

/**
 * Validar conexión y obtener token
 */
export const validateSamsungConnection = async (id: number): Promise<string> => {
    const screen = await getById(id);

    if (!screen || !screen.ip_address) {
        throw new Error('Pantalla no encontrada o sin IP');
    }

    console.log(`🔌 Validando conexión con TV ${id} (${screen.ip_address})`);

    // Conectar SIN token para obtener uno nuevo
    const { ws, token } = await createWebSocketConnection(screen.ip_address);

    // Cerrar conexión
    ws.close();

    if (!token) {
        throw new Error('No se pudo obtener token del TV. Acepta la solicitud en el TV.');
    }

    // Guardar token en BD
    await registerToken(id, token);

    console.log(`✅ Token guardado para TV ${id}`);

    return token;
};

/**
 * Enviar comando al TV Samsung
 */
export const sendSamsungCommand = async (id: number, key: string): Promise<void> => {
    const screen = await getById(id);

    if (!screen || !screen.ip_address) {
        throw new Error('Pantalla no encontrada o sin IP');
    }

    if (!screen.client_token) {
        throw new Error('TV no validado. Valida la conexión primero.');
    }

    console.log(`📤 Enviando comando ${key} a TV ${id}`);

    const { ws } = await createWebSocketConnection(screen.ip_address, screen.client_token);

    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            method: "ms.remote.control",
            params: {
                Cmd: "Click",
                DataOfCmd: key,
                Option: "false",
                TypeOfRemote: "SendRemoteKey"
            }
        });

        ws.send(payload);
        console.log(`✅ Comando ${key} enviado a TV ${id}`);

        setTimeout(() => {
            ws.close();
            resolve();
        }, 1000);
    });
};

/**
 * Abrir navegador Samsung
 */
export const openSamsungBrowser = async (id: number): Promise<void> => {
    const screen = await getById(id);

    if (!screen || !screen.ip_address) {
        throw new Error('Pantalla no encontrada o sin IP');
    }

    console.log(`🌐 Abriendo navegador en TV ${id}`);

    const endpoint = `http://${screen.ip_address}:8001/api/v2/applications/org.tizen.browser`;

    const response = await fetch(endpoint, { method: 'POST' });

    if (!response.ok) {
        throw new Error('Error abriendo navegador');
    }

    console.log(`✅ Navegador abierto en TV ${id}`);
};

/**
 * Encender TV Samsung usando Wake-on-LAN
 */
export const wakeOnLan = async (id: number): Promise<void> => {
    const screen = await getById(id);

    if (!screen) {
        throw new Error('Pantalla no encontrada');
    }

    if (!screen.mac_address) {
        throw new Error('MAC address no configurada');
    }

    const wol = require('wake_on_lan');

    return new Promise((resolve, reject) => {
        wol.wake(screen.mac_address, (err: any) => {
            if (err) {
                return reject(err);
            }
            console.log(`✅ Señal WoL enviada a ${screen.mac_address}`);
            resolve();
        });
    });
};
