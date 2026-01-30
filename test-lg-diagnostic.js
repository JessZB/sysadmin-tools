// Script de diagnóstico para LG TV WebSocket
const lgtv = require('lgtv2');

const TV_IP = '10.20.10.139';
const PORTS = [3000, 3001, 3002]; // Puertos comunes de LG webOS

console.log(`🔍 Probando conexión a LG TV en ${TV_IP}...`);
console.log('');

let currentPortIndex = 0;
let client = null;

function tryNextPort() {
    if (currentPortIndex >= PORTS.length) {
        console.log('❌ No se pudo conectar en ningún puerto');
        console.log('');
        console.log('💡 Posibles soluciones:');
        console.log('1. Verifica que el TV esté encendido (no en standby)');
        console.log('2. Habilita "LG Connect Apps" en el TV:');
        console.log('   Settings → General → Mobile TV On → Turn On');
        console.log('3. Verifica que el TV esté en la misma red');
        console.log('4. Reinicia el TV');
        process.exit(1);
    }

    const port = PORTS[currentPortIndex];
    console.log(`🔌 Intentando puerto ${port}...`);

    client = lgtv({
        url: `ws://${TV_IP}:${port}`,
        timeout: 5000, // 5 segundos de timeout
        reconnect: false // No reconectar automáticamente
    });

    client.on('connect', () => {
        console.log(`✅ ¡Conectado exitosamente en puerto ${port}!`);
        console.log('');
        
        // Si es la primera conexión, el TV mostrará un diálogo de emparejamiento
        console.log('📺 Si ves un diálogo en el TV, acepta el emparejamiento');
        console.log('');

        // Prueba: Mostrar notificación
        console.log('📤 Enviando notificación de prueba...');
        client.request('ssap://system.notifications/createToast', {
            message: '✅ Conexión exitosa desde SysAdmin Tools'
        }, (err, res) => {
            if (err) {
                console.log('⚠️  Error al enviar notificación:', err.message);
            } else {
                console.log('✅ Notificación enviada correctamente');
            }

            // Obtener información del TV
            console.log('');
            console.log('📋 Obteniendo información del TV...');
            client.request('ssap://system/getSystemInfo', (err, res) => {
                if (!err && res) {
                    console.log('');
                    console.log('📺 Información del TV:');
                    console.log(`   Modelo: ${res.modelName || 'N/A'}`);
                    console.log(`   webOS: ${res.majorVer}.${res.minorVer || 0}`);
                    console.log(`   Fabricante: ${res.manufacturer || 'N/A'}`);
                }

                // Cerrar conexión
                setTimeout(() => {
                    console.log('');
                    console.log('✅ Prueba completada. Cerrando conexión...');
                    client.disconnect();
                    process.exit(0);
                }, 2000);
            });
        });
    });

    client.on('error', (err) => {
        console.log(`❌ Error en puerto ${port}: ${err.message}`);
        
        if (err.code === 'ECONNRESET') {
            console.log('   → El TV cerró la conexión abruptamente');
            console.log('   → Esto puede significar:');
            console.log('      • El puerto no es el correcto para este modelo');
            console.log('      • El TV requiere emparejamiento (acepta el diálogo)');
            console.log('      • El TV está en modo standby profundo');
        } else if (err.code === 'ECONNREFUSED') {
            console.log('   → El TV rechazó la conexión (puerto cerrado)');
        } else if (err.code === 'ETIMEDOUT') {
            console.log('   → Timeout de conexión (firewall o TV apagado)');
        }
        
        console.log('');
        
        // Intentar siguiente puerto
        currentPortIndex++;
        setTimeout(tryNextPort, 1000);
    });

    client.on('close', () => {
        console.log(`🔌 Conexión cerrada en puerto ${port}`);
    });
}

// Iniciar prueba
tryNextPort();
