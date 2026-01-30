// npm install lgtv2
const lgtv = require('lgtv2')({
    url: 'ws://10.20.10.139:3000', // Prueba 3000 o 3001 para modelos 2023+
    timeout: 5000,
    reconnect: false
});

console.log('🔌 Conectando a LG TV...');
console.log('📺 Si aparece un diálogo en el TV, acepta el emparejamiento');
console.log('');

lgtv.on('connect', () => {
    console.log('✅ Conectado por WebSocket');
    
    // Prueba: Mostrar un mensajito en pantalla
    lgtv.request('ssap://system.notifications/createToast', {
        message: 'Hola desde SysAdmin Tools'
    }, (err, res) => {
        if (err) {
            console.log('⚠️  Error al enviar notificación:', err.message);
        } else {
            console.log('✅ Notificación enviada');
        }
        
        // Cerrar después de 3 segundos
        setTimeout(() => {
            console.log('🔌 Cerrando conexión...');
            lgtv.disconnect();
            process.exit(0);
        }, 3000);
    });
    
    // Prueba: Obtener lista de apps
    // lgtv.request('ssap://com.webos.applicationManager/listLaunchPoints', (err, res) => {
    //     console.log(res);
    // });
});

lgtv.on('error', (err) => {
    console.log('❌ Error:', err.message);
    console.log('');

    console.log(err)
    
    if (err.code === 'ECONNRESET') {
        console.log('💡 Posibles causas:');
        console.log('1. Puerto incorrecto para este modelo de TV');
        console.log('   → Prueba cambiar 3000 por 3001 o 3002 en la línea 3');
        console.log('2. TV requiere emparejamiento');
        console.log('   → Acepta el diálogo que aparece en la pantalla del TV');
        console.log('3. TV en modo standby profundo');
        console.log('   → Enciende el TV completamente (no solo con el LED rojo)');
        console.log('4. "LG Connect Apps" deshabilitado');
        console.log('   → Settings → General → Mobile TV On → Turn On');
    } else if (err.code === 'ECONNREFUSED') {
        console.log('💡 El TV rechazó la conexión:');
        console.log('   → Verifica que el TV esté encendido');
        console.log('   → Verifica la IP del TV');
    } else if (err.code === 'ETIMEDOUT') {
        console.log('💡 Timeout de conexión:');
        console.log('   → Verifica que el TV esté en la misma red');
        console.log('   → Verifica que no haya firewall bloqueando');
    }
    
    process.exit(1);
});

lgtv.on('close', () => {
    console.log('🔌 Conexión cerrada');
});