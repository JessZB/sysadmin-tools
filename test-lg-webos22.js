process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const lgtv = require('lgtv2');
const wol = require('wake_on_lan');
const readline = require('readline');

// --- CONFIGURACIÓN ---
const CONFIG = {
    ip: '10.20.10.139',       // <--- TU IP
    mac: '7c:64:6c:07:a2:95', // <--- TU MAC
    port: 3001,
    token: '1e8c23b92fe278a23e0d725fd3fa7d11',                // <--- TU TOKEN GUARDADO
    
    // URL que se abrirá automáticamente al encender/reconectar
    // Pon la URL de tu dashboard de tasas aquí:
    dashboardUrl: 'https://google.com' 
};

const url = `wss://${CONFIG.ip}:${CONFIG.port}`;

console.log(`🔌 Panel LG Monitor - IP: ${CONFIG.ip}`);
console.log(`🎯 Dashboard configurado: ${CONFIG.dashboardUrl}`);

let menuActivo = false;
let desconexionDetectada = false; // Para saber si venimos de un apagado

const tv = lgtv({
    url: url,
    timeout: 3000,
    reconnect: 2000, // <--- ESTO ASEGURA QUE LA CONEXIÓN SE REANUDE
    clientKey: CONFIG.token,
    saveKey: (key, cb) => {
        console.log(`\n🔐 CLAVE NUEVA: ${key}\n`);
        CONFIG.token = key;
        cb(null);
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- GESTIÓN DE EVENTOS DE CONEXIÓN ---

tv.on('connect', () => {
    console.log('\n\n🟢 CONECTADO AL TELEVISOR');
    
    // LÓGICA DE AUTO-RECUPERACIÓN
    // Si veníamos de estar desconectados (apagado), forzamos abrir el dashboard
    if (desconexionDetectada) {
        console.log('🔄 Restaurando sesión: Abriendo navegador automáticamente...');
        tv.request('ssap://system.launcher/open', { target: CONFIG.dashboardUrl });
        desconexionDetectada = false;
    }

    if (!menuActivo) mostrarMenu();
});

tv.on('connecting', () => {
    // Intentando reconectar en silencio...
});

tv.on('close', () => {
    // Detectamos que se fue la conexión (TV Apagado)
    if (!desconexionDetectada) {
        // Solo avisamos la primera vez que se cae
        // console.log('\n🔴 TV Desconectado (Esperando reconexión...)');
        desconexionDetectada = true;
    }
});

tv.on('error', (err) => {
    // Ignorar errores mientras está apagado
});

// --- ACCIONES ---

const actions = {
    '1': {
        desc: 'Forzar Dashboard (Abrir Navegador)',
        run: () => {
            tv.request('ssap://system.launcher/open', { target: CONFIG.dashboardUrl }, logResp);
        }
    },
    '2': {
        desc: 'Enviar Mensaje (Toast)',
        run: () => {
            tv.request('ssap://system.notifications/createToast', { message: 'Monitor Activo' }, logResp);
        }
    },
    '5': {
        desc: 'Apagar TV',
        run: () => {
            tv.request('ssap://system/turnOff', null, () => {
                console.log('💤 Apagando...');
                desconexionDetectada = true; // Marcamos que se va a apagar
                setTimeout(mostrarMenu, 2000);
            });
        }
    },
    '10': {
        desc: '⚡ ENCENDER TV (Wake-on-LAN)',
        run: () => {
            console.log(`\n🚀 Lanzando señal de arranque a ${CONFIG.mac}...`);
            wol.wake(CONFIG.mac);
            setTimeout(() => wol.wake(CONFIG.mac), 300);
            
            console.log('✅ Señal enviada. El dashboard se abrirá al conectar.');
            // Volvemos al menú para que veas el estado cambiar a VERDE solo
            setTimeout(mostrarMenu, 2000);
        }
    },
    '0': {
        desc: 'Salir',
        run: () => {
            console.log('👋 Adiós.');
            tv.disconnect();
            process.exit(0);
        }
    }
};

function logResp(err, res) {
    if (err) console.log('   ❌ Error al ejecutar.');
    else console.log('   ✅ Comando enviado.');
    setTimeout(mostrarMenu, 500);
}

function mostrarMenu() {
    menuActivo = true;
    const estado = tv.connected ? '🟢 ONLINE' : '🔴 OFFLINE (Reintentando...)';
    
    console.log(`\n--- MENÚ (${estado}) ---`);
    for (const [key, action] of Object.entries(actions)) {
        console.log(`${key}. ${action.desc}`);
    }
    
    rl.question('\nOpción: ', (opt) => {
        menuActivo = false;
        const action = actions[opt];
        if (action) {
            action.run();
        } else {
            // Si le das Enter vacío actualiza el estado visual
            mostrarMenu();
        }
    });
}

// Arranque
console.log('Iniciando servicio de monitorización...');
// Si al arrancar ya está conectado, lanzamos el dashboard también
setTimeout(() => {
    if(tv.connected) {
        console.log('🚀 Arranque inicial: Abriendo dashboard...');
        tv.request('ssap://system.launcher/open', { target: CONFIG.dashboardUrl });
    }
    mostrarMenu();
}, 1500);