import ping from 'ping';
import { PingResult } from '../../shared/interfaces/service.interface';

/**
 * Ejecuta un ping a un host específico
 * @param host - IP o URL a hacer ping
 * @returns Resultado del ping con estadísticas
 */
export const executePing = async (host: string): Promise<PingResult> => {
    try {
        const config = {
            timeout: 5,  // 5 segundos de timeout
            extra: ['-n', '4'], // 4 pings (Windows style)
        };

        console.log(`🏓 Ejecutando ping a ${host}...`);

        const result = await ping.promise.probe(host, config);

        console.log(`${result.alive ? '✅' : '❌'} Ping a ${host}: ${result.alive ? 'Disponible' : 'No disponible'}`);

        // Helper function to safely parse numeric values
        const parseNumeric = (value: any): number | undefined => {
            if (value === 'unknown' || value === undefined || value === null) {
                return undefined;
            }
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(parsed) ? undefined : parsed;
        };

        return {
            alive: result.alive,
            time: parseNumeric(result.time),
            packetLoss: result.packetLoss ? String(result.packetLoss) : '0%',
            min: parseNumeric(result.min),
            max: parseNumeric(result.max),
            avg: parseNumeric(result.avg),
            host: result.host,
            numeric_host: result.numeric_host
        };
    } catch (error: any) {
        console.error(`❌ Error ejecutando ping a ${host}:`, error.message);
        return {
            alive: false,
            host,
            packetLoss: '100%'
        };
    }
};
