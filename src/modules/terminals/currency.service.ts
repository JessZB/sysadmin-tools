import { Terminal } from '../../shared/interfaces/terminal.interface';
import { Currency } from '../../shared/interfaces/currency.interface';
import { getSqlServerConnection } from '../../shared/db/mssql.factory';
import sql from 'mssql';

// ============================================
// CONFIGURACIÓN DEL CACHÉ
// ============================================

// Estructura del caché: Map<terminalId, CacheEntry>
interface CacheEntry {
    data: Currency[];      // Los datos de las monedas
    timestamp: number;     // Cuándo se guardó (milisegundos)
    terminalName: string;  // Para logs
}

// Almacén del caché en memoria
const currencyCache = new Map<number, CacheEntry>();

// Duración del caché en milisegundos (10 minutos)
const CACHE_DURATION = 10 * 60 * 1000;

// Constante con los códigos de moneda a mostrar
const CURRENCY_CODES = ['0000000003', '0000000002', 'TFSM', 'CXC'];

// ============================================
// FUNCIONES DE CONSULTA A BASE DE DATOS
// ============================================

/**
 * Obtiene las tasas de cambio desde una terminal POS (ADM_LOCAL)
 */
export const getCurrencyRatesFromPOS = async (terminal: Terminal): Promise<Currency[]> => {
    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await getSqlServerConnection(terminal);

        const result = await pool.request().query(`
            SELECT c_codmoneda, c_descripcion, n_factor, c_simbolo, b_activa
            FROM ADM_LOCAL.dbo.MA_MONEDAS 
            WHERE b_activa = 1 
            AND c_codmoneda IN ('0000000003', '0000000002', 'TFSM', 'CXC')
            ORDER BY 
                CASE c_codmoneda
                    WHEN '0000000003' THEN 1
                    WHEN '0000000002' THEN 2
                    WHEN 'TFSM' THEN 3
                    WHEN 'CXC' THEN 4
                END
        `);

        return result.recordset as Currency[];
    } catch (error) {
        console.error('Error fetching currencies from POS:', error);
        throw new Error(`No se pudieron obtener las tasas de ${terminal.name}`);
    } finally {
        if (pool) await pool.close();
    }
};

/**
 * Obtiene las tasas de cambio desde el servidor (VAD10)
 */
export const getCurrencyRatesFromServer = async (terminal: Terminal): Promise<Currency[]> => {
    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await getSqlServerConnection(terminal);

        const result = await pool.request().query(`
            SELECT c_codmoneda, c_descripcion, n_factor, c_simbolo, b_activa
            FROM VAD10.dbo.MA_MONEDAS 
            WHERE b_activa = 1 
            AND c_codmoneda IN ('0000000003', '0000000002', 'TFSM', 'CXC')
            ORDER BY 
                CASE c_codmoneda
                    WHEN '0000000003' THEN 1
                    WHEN '0000000002' THEN 2
                    WHEN 'TFSM' THEN 3
                    WHEN 'CXC' THEN 4
                END
        `);

        return result.recordset as Currency[];
    } catch (error) {
        console.error('Error fetching currencies from Server:', error);
        throw new Error(`No se pudieron obtener las tasas de ${terminal.name}`);
    } finally {
        if (pool) await pool.close();
    }
};

// ============================================
// FUNCIÓN PRINCIPAL CON CACHÉ
// ============================================

/**
 * Obtiene las tasas de cambio según el tipo de terminal
 * Implementa caché en memoria para reducir consultas a SQL Server
 */
export const getCurrencyRates = async (terminal: Terminal): Promise<Currency[]> => {
    // Validar que el terminal tenga ID
    if (!terminal.id) {
        throw new Error('Terminal sin ID válido');
    }

    const now = Date.now();
    const cached = currencyCache.get(terminal.id);

    // ✅ CACHE HIT: Si existe y no ha expirado
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        const age = Math.floor((now - cached.timestamp) / 1000); // segundos
        console.log(`✅ [CACHE HIT] Terminal ${terminal.id} (${terminal.name}) - Edad: ${age}s`);
        return cached.data;
    }

    // ❌ CACHE MISS: Consultar base de datos
    console.log(`❌ [CACHE MISS] Terminal ${terminal.id} (${terminal.name}) - Consultando BD...`);

    const currencies = terminal.is_server
        ? await getCurrencyRatesFromServer(terminal)
        : await getCurrencyRatesFromPOS(terminal);

    // Guardar en caché
    currencyCache.set(terminal.id, {
        data: currencies,
        timestamp: now,
        terminalName: terminal.name
    });

    console.log(`💾 [CACHE SAVE] Terminal ${terminal.id} guardado en caché`);

    return currencies;
};

// ============================================
// FUNCIONES DE GESTIÓN DEL CACHÉ
// ============================================

/**
 * Limpia el caché de una terminal específica o de todas
 */
export const clearCurrencyCache = (terminalId?: number): void => {
    if (terminalId) {
        const deleted = currencyCache.delete(terminalId);
        console.log(`🗑️ [CACHE CLEAR] Terminal ${terminalId} - ${deleted ? 'Eliminado' : 'No existía'}`);
    } else {
        const size = currencyCache.size;
        currencyCache.clear();
        console.log(`🗑️ [CACHE CLEAR ALL] ${size} entradas eliminadas`);
    }
};

/**
 * Obtiene estadísticas del caché
 */
export const getCacheStats = () => {
    const now = Date.now();
    const entries = Array.from(currencyCache.entries()).map(([id, entry]) => ({
        terminalId: id,
        terminalName: entry.terminalName,
        age: Math.floor((now - entry.timestamp) / 1000), // segundos
        expiresIn: Math.floor((CACHE_DURATION - (now - entry.timestamp)) / 1000) // segundos
    }));

    return {
        totalEntries: currencyCache.size,
        cacheDuration: CACHE_DURATION / 1000, // segundos
        entries
    };
};

/**
 * Limpieza automática de entradas expiradas
 * Ejecutar periódicamente con setInterval
 */
export const cleanExpiredCache = (): number => {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of currencyCache.entries()) {
        if ((now - entry.timestamp) >= CACHE_DURATION) {
            currencyCache.delete(id);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 [CACHE CLEANUP] ${cleaned} entradas expiradas eliminadas`);
    }

    return cleaned;
};
