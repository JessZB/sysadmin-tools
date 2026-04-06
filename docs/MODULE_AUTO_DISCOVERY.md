# Arquitectura de Auto-Descubrimiento de Módulos

Esta documentación describe cómo funciona el sistema automático de registro y validación de módulos en **SysAdmin Forum**, implementado bajo la "Opción 3" (Escaneo Dinámico de Rutas y Vistas).

## 1. El Problema Original
Anteriormente, para crear un nuevo módulo (por ejemplo, `reportes`), un desarrollador debía:
1. Crear el controlador (`reportes.controller.ts`).
2. Crear la ruta (`reportes.routes.ts`).
3. Crear la vista EJS (`src/views/reportes/reportes.ejs` o similar).
4. **Mantenimiento Crítico:** Ir manualmente a la base de datos (tabla `sys_modules`) e insertar el código exacto, o administrarlo por interfaz. Si el código no coincidía con las carpetas, el sistema fallaba sin advertencia, afectando la pantalla de Roles.

## 2. La Solución (Auto-Descubrimiento en Arranque)
El flujo actual automatiza el paso 4 y previene errores arquitectónicos. Se vale de un escaner dinámico (`ModuleScannerService.ts`) que se activa únicamente cuando se inicia la aplicación.

### Flujo Exacto
1. **Inicio de App:** Se levanta Node.js (`npm run dev` o `npm start`). En `src/app.ts`, antes de inicializar web sockets o rutas dinámicas, el núcleo llama a `ModuleScannerService.scanAndSync()`.
2. **Escaneo Recursivo:**
    - Se escanea la carpeta `src/modules/` detectando todos los archivos con patrón `*.routes.ts`. El nombre de carpeta o archivo antes del punto se toma como el `module_code`.
    - Por cada patrón detectado, el escáner se dirige a la carpeta `src/views/` (ej. `src/views/{module_code}/`) buscando si existe una vista EJS correspondiente.
3. **Cruzamiento (Sync) con DB:**
    - El escáner lee todos los módulos registrados en la base de datos MySQL (`sys_modules`).
    - **Nuevos Módulos:** Si encuentra rutas que NO están en la base de datos, ejecuta un `INSERT` asignándoles la categoría por defecto (ID 1: "Sin Categoría").
    - **Módulos Rotos:** Si un módulo existe en código o BD, pero carece de su `.routes.ts` O de su archivo visual `.ejs`, el sistema actualiza la fila en base de datos con `is_configured = 0`. Si están completos, se marca `is_configured = 1`.

## 3. Beneficios de Rendimiento y DX (Developer Experience)
*   **Costo Nulo en Ejecución (Runtime):** Todo el escaneo pesado y operaciones sobre el File System (disco duro) ocurren en los primeros 2 segundos de iniciar o reiniciar la app. Cuando la aplicación está activa, lee de base de datos o memoria, siendo instantáneo.
*   **A prueba de Errores Humanos:** Un desarrollador no necesita saber de bases de datos. Simplemente crea sus archivos `.ts` en la carpeta correcta y en el próximo `npm run dev`, el sistema "absorbe" el módulo.

## 4. UI: Restricción de Roles
En lugar de fallar de manera oculta, los modelos detectados como incompletos (`is_configured = 0`) aparecen en el frontend bajo la estética **Nothing Style** como cajas desactivadas con un alert rojo (Badge). Esto advierte tempranamente a un perfil administrador y previene que intente otorgarle acceso a un usuario a una pantalla web a medio desarrollar.

---
*Escrito para asegurar una mantenibilidad fluida a medida que el proyecto escala.*
