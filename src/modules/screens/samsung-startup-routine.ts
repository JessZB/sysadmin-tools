import { getById } from './screens.service';
import { wakeOnLan, openSamsungBrowser } from './samsung-websocket';

/**
 * Rutina de encendido automático: WoL → Esperar 15s → Abrir Navegador
 */
export const startRoutine = async (id: number): Promise<void> => {
    const screen = await getById(id);

    if (!screen) {
        throw new Error('Pantalla no encontrada');
    }

    if (!screen.mac_address) {
        throw new Error('Se requiere MAC Address para encender el TV');
    }

    console.log(`🚀 Iniciando rutina de encendido para ${screen.name}...`);

    // 1. Enviar Wake-on-LAN
    await wakeOnLan(id);

    // 2. Esperar 15 segundos
    console.log('⏳ Esperando 15 segundos para que el TV encienda...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 3. Abrir navegador
    console.log('🌐 Abriendo navegador...');
    await openSamsungBrowser(id);

    console.log('✅ Rutina completada exitosamente');
};
