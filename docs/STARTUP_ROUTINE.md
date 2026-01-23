# Rutina de Encendido Automático - Samsung TV

## 🚀 Descripción

La rutina de encendido automático permite encender un Samsung TV y abrir el navegador automáticamente con un solo clic. Esta funcionalidad combina:

1. **Wake-on-LAN (WoL)** - Encender el TV remotamente
2. **Polling inteligente** - Esperar a que el TV esté listo
3. **Apertura automática del navegador** - Lanzar la aplicación web

## ✅ Requisitos

### Hardware
- ✅ Samsung Tizen TV (2016+)
- ✅ Conexión Ethernet (Wake-on-LAN no funciona confiablemente por WiFi)
- ✅ TV y servidor en la misma red local

### Configuración del TV
1. **Habilitar Wake-on-LAN**:
   - Menú → General → Red → Expert Settings
   - Activar "Wake On LAN"

2. **Configurar MAC Address**:
   - Debe estar guardada en la base de datos
   - Se muestra en el panel de control Samsung

3. **Configurar IP Address** (opcional pero recomendado):
   - Ayuda a verificar conectividad
   - Se usa para enviar comandos

## 🎯 Cómo Funciona

### Flujo Completo

```
1. Usuario hace clic en "Rutina de Encendido"
   ↓
2. Se envían 3 paquetes Wake-on-LAN (redundancia)
   ↓
3. Sistema espera 2 segundos entre cada intento
   ↓
4. Polling cada 2 segundos (máximo 15 intentos = 30 seg)
   ↓
5. Cuando el TV responde:
   - Se envía comando KEY_POWER para confirmar
   - Se espera 2 segundos adicionales
   - Se abre el navegador con la URL configurada
   ↓
6. Rutina completada ✅
```

### Detalles Técnicos

**Backend** (`screens.service.ts`):
```typescript
export const startRoutine = async (id: number, targetUrl?: string)
```

**Parámetros**:
- `id`: ID de la pantalla
- `targetUrl`: URL a abrir (por defecto: `process.env.SCREEN_TARGET_URL`)

**Proceso**:
1. Validar que existe MAC address
2. Enviar 3 paquetes WoL con 500ms de separación
3. Polling cada 2 segundos hasta obtener respuesta
4. Timeout después de 30 segundos
5. Abrir navegador Tizen con URL especificada

## 🖥️ Uso desde la Interfaz

### Botón en la UI

El botón aparece automáticamente si:
- ✅ El TV es tipo `browser` (Samsung)
- ✅ Tiene `mac_address` configurada

**Ubicación**: Panel de control Samsung, debajo de los botones Mute/Power

**Aspecto**:
```
🚀 Rutina de Encendido
```

**Color**: Verde (`btn-success`)

### Proceso para el Usuario

1. **Hacer clic** en "Rutina de Encendido"
2. **Ver progreso**:
   ```
   🚀 Iniciando rutina...
   📡 Enviando señal de encendido...
   ⏳ Esperando respuesta del TV...
   🌐 Abrirá el navegador automáticamente
   ```
3. **Esperar** hasta 30 segundos
4. **Confirmación**:
   ```
   ✅ Rutina iniciada
   El TV encenderá y abrirá el navegador automáticamente.
   ```

## 📡 API Endpoint

### POST `/screens/startup`

**Request**:
```json
{
  "id": 1
}
```

**Response (Éxito)**:
```json
{
  "success": true,
  "message": "Rutina de encendido iniciada. El TV encenderá y abrirá el navegador automáticamente en ~30 segundos."
}
```

**Response (Error)**:
```json
{
  "success": false,
  "message": "Se requiere MAC Address para encender el TV"
}
```

### Ejecución en Segundo Plano

La rutina se ejecuta de forma **asíncrona**:
- El endpoint responde inmediatamente
- La rutina continúa en el servidor
- Los logs muestran el progreso en tiempo real

## 📊 Logs del Servidor

### Ejemplo de Ejecución Exitosa

```
🚀 Iniciando rutina de encendido para TV Sala Principal...
📡 Enviando señales WoL a 1C:86:9A:2E:52:D3...
✅ Señales WoL enviadas
⏳ Intento de conexión 1/15...
⏳ Intento de conexión 2/15...
⏳ Intento de conexión 3/15...
✅ TV Online y respondiendo
🌐 Abriendo navegador en: http://localhost:4000/proxy/
✅ Rutina completada exitosamente
```

### Ejemplo de Timeout

```
🚀 Iniciando rutina de encendido para TV Sala Principal...
📡 Enviando señales WoL a 1C:86:9A:2E:52:D3...
✅ Señales WoL enviadas
⏳ Intento de conexión 1/15...
⏳ Intento de conexión 2/15...
...
⏳ Intento de conexión 15/15...
❌ Timeout: El TV no respondió en 30 segundos
```

## ⚙️ Configuración

### Variable de Entorno

**`.env`**:
```env
SCREEN_TARGET_URL=/proxy/
```

Esta URL se abre automáticamente cuando el TV enciende.

### Personalizar Timeout

En `screens.service.ts`:
```typescript
const maxAttempts = 15; // 30 segundos (15 * 2seg)
```

Cambiar `maxAttempts` para ajustar el tiempo máximo de espera.

### Personalizar Intervalo de Polling

```typescript
}, 2000); // Intentar cada 2 segundos
```

Cambiar `2000` (milisegundos) para ajustar frecuencia de intentos.

## 🐛 Troubleshooting

### El TV no enciende

**Verificar**:
1. ✅ Wake-on-LAN habilitado en el TV
2. ✅ Conexión por Ethernet (no WiFi)
3. ✅ MAC address correcta en la base de datos
4. ✅ TV y servidor en la misma red

**Test manual**:
```bash
node test-samsung.js wol
```

### El TV enciende pero no abre el navegador

**Posibles causas**:
- El modelo de TV no soporta `openApp` API
- El navegador Tizen no está instalado
- La URL no es accesible desde el TV

**Solución alternativa**:
- El TV enciende correctamente
- Abrir el navegador manualmente
- Usar el botón "Abrir Visor" después

### Timeout constante

**Verificar**:
1. ✅ El TV tarda más de 30 segundos en arrancar
2. ✅ Firewall bloqueando puerto 8002
3. ✅ IP address incorrecta

**Solución**:
- Aumentar `maxAttempts` a 20-25
- Verificar conectividad con `node test-ping-tv.js`

### Error "nodejs remote" en el TV

**Normal**: El TV muestra este nombre porque la librería lo tiene codificado.

**Solución**:
- Aceptar el emparejamiento
- Marcar como "Confiable" en el TV
- Configurar "Primera vez solamente"

## 📈 Mejoras Futuras

### Posibles Optimizaciones

1. **Detección de estado del TV**:
   - Verificar si ya está encendido antes de enviar WoL
   - Ahorrar tiempo si el TV ya está activo

2. **Progreso en tiempo real**:
   - WebSocket para actualizar UI con el progreso
   - Mostrar "Intento 3/15..." en la interfaz

3. **Reintentos inteligentes**:
   - Enviar WoL adicional si no hay respuesta después de 10 intentos
   - Ajustar intervalo dinámicamente

4. **Múltiples TVs**:
   - Rutina para encender todos los TVs de una sucursal
   - Ejecución paralela con Promise.all()

## ✅ Checklist de Implementación

- [x] Método `startRoutine` en `screens.service.ts`
- [x] Controller `startupRoutine` en `screens.controller.ts`
- [x] Ruta POST `/screens/startup` en `screens.routes.ts`
- [x] Función `startupRoutine()` en `screens.client.js`
- [x] Botón "Rutina de Encendido" en `list.ejs`
- [x] Documentación completa
- [ ] Testing en TV real
- [ ] Ajuste de timeouts según hardware

## 🎯 Casos de Uso

### Caso 1: Apertura de Sucursal
```
Gerente llega a la sucursal
   ↓
Abre la app web en su teléfono
   ↓
Click en "Rutina de Encendido" para cada TV
   ↓
Todos los TVs encienden y muestran el dashboard
```

### Caso 2: Mantenimiento Remoto
```
Administrador desde oficina central
   ↓
Necesita verificar un TV específico
   ↓
Click en "Rutina de Encendido"
   ↓
TV enciende y muestra la interfaz
   ↓
Puede enviar comandos adicionales
```

### Caso 3: Automatización
```
Cron job o scheduler
   ↓
POST /screens/startup para cada TV
   ↓
Todos los TVs encienden a hora programada
   ↓
Listos para el día laboral
```

## 📝 Notas Importantes

⚠️ **Wake-on-LAN requiere Ethernet**: WiFi no es confiable para WoL
⚠️ **Timeout de 30 segundos**: TVs viejos pueden tardar más
⚠️ **Emparejamiento necesario**: Primera vez requiere aceptar en el TV
⚠️ **openApp puede fallar**: No todos los modelos lo soportan

✅ **Funciona mejor con**: Samsung Tizen 2016+ por Ethernet
✅ **Rutina asíncrona**: No bloquea el servidor
✅ **Logs detallados**: Fácil debugging en consola
