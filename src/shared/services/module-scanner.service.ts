import fs from 'fs';
import path from 'path';
import { mainDbPool } from '../db/main.db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ModuleScannerService {
    /**
     * Scans the src/modules and src/views directories to discover and validate modules.
     * Synchronizes this information with the sys_modules table in MySQL.
     */
    static async scanAndSync() {
        console.log('[ModuleScanner] Iniciando auto-descubrimiento de módulos...');
        
        const modulesPath = path.join(process.cwd(), 'src', 'modules');
        const viewsPath = path.join(process.cwd(), 'src', 'views');

        if (!fs.existsSync(modulesPath)) {
            console.warn('[ModuleScanner] No se encontró el directorio src/modules.');
            return;
        }

        // 1. Obtener carpetas (posibles módulos) en src/modules
        const excludedModules = ['auth', 'media']; // Módulos internos que no deben ser elegibles
        const entries = fs.readdirSync(modulesPath, { withFileTypes: true });
        const discoveredModules = entries
            .filter(entry => entry.isDirectory() && !excludedModules.includes(entry.name))
            .map(dir => dir.name);

        const connection = await mainDbPool.getConnection();
        let syncedCount = 0;

        try {
            await connection.beginTransaction();

            // 2. Traer todos los módulos actualmente en BD
            const [dbModules] = await connection.query<RowDataPacket[]>('SELECT code FROM sys_modules');
            const dbModuleCodes = dbModules.map(m => m.code);

            // 3. Procesar los módulos encontrados en el código fuente
            for (const code of discoveredModules) {
                // Verificar si tiene enrutador
                const routeFile = path.join(modulesPath, code, `${code}.routes.ts`);
                const hasRoute = fs.existsSync(routeFile);

                // Verificar si tiene vistas
                const viewFolder = path.join(viewsPath, code);
                const hasView = fs.existsSync(viewFolder);

                const isConfigured = (hasRoute && hasView) ? 1 : 0;
                
                // Nombre amigable (Capitalizado)
                const defaultName = code.charAt(0).toUpperCase() + code.slice(1);

                if (dbModuleCodes.includes(code)) {
                    // Update existente
                    await connection.query(
                        'UPDATE sys_modules SET is_configured = ? WHERE code = ?',
                        [isConfigured, code]
                    );
                } else {
                    // Insertar nuevo si es válido o descubierto
                    await connection.query<ResultSetHeader>(
                        'INSERT INTO sys_modules (code, name, icon, category_id, is_configured) VALUES (?, ?, ?, ?, ?)',
                        [code, defaultName, 'bi-box', 1, isConfigured]
                    );
                }
                syncedCount++;
            }

            // 4. Marcar como NO configurados aquellos en BD que ya no existen en archivos físicos
            for (const dbCode of dbModuleCodes) {
                if (!discoveredModules.includes(dbCode)) {
                    await connection.query(
                        'UPDATE sys_modules SET is_configured = 0 WHERE code = ?',
                        [dbCode]
                    );
                }
            }

            await connection.commit();
            console.log(`[ModuleScanner] Completado. Módulos procesados: ${syncedCount}`);
        } catch (error) {
            await connection.rollback();
            console.error('[ModuleScanner] Error sincronizando módulos:', error);
        } finally {
            connection.release();
        }
    }
}
