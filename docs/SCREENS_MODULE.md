# Configuración del Módulo de Pantallas

## 📺 Tipos de Pantallas

### **1. Televisores Samsung (Navegador)**
- **Tipo**: `browser`
- **IP**: ❌ **OPCIONAL** (solo para referencia administrativa)
- **Socket ID**: ✅ **AUTOMÁTICO** (se registra cuando el TV se conecta)
- **Funcionamiento**:
  1. El TV abre `http://tu-servidor:4000/screens/viewer/1` en su navegador
  2. Se conecta automáticamente vía Socket.io
  3. Carga la URL configurada en `SCREEN_TARGET_URL`
  4. Desde el panel admin puedes recargar remotamente, controlar el volumen y enviar comandos mediante WebSockets (Tizen API).

### **2. Televisores LG (WebOS & DLNA)**
- **Tipo**: `dlna` (Actualmente soporta conexiones híbridas DLNA/WebOS)
- **IP**: ✅ **OBLIGATORIO** (para conectarse vía WebSocket y enviar comandos UPnP)
- **Funcionamiento**:
  1. El TV debe estar en la misma red que el servidor
  2. Control total: A través de WebOS WebSockets es posible mutear, cambiar volumen, apagar, enviar notificaciones (Toast) y abrir el navegador nativo remotamente.
  3. Reproducción (DLNA): Coloca videos en `public/media` y selecciona "Reproducir". El servidor enviará el stream a la pantalla LG.

## 🔧 Variables de Entorno

Agrega esta variable a tu archivo `.env`:

```bash
# URL que se mostrará en los televisores Browser
SCREEN_TARGET_URL=/proxy/
```

### Opciones de Configuración:

1. **Usar Proxy (Recomendado)**
   ```bash
   SCREEN_TARGET_URL=/proxy/
   ```
   - Evita problemas de CORS y X-Frame-Options
   - El servidor actúa como intermediario
   - Configurar el target del proxy en `src/app.ts` línea 57

2. **URL Externa Directa**
   ```bash
   SCREEN_TARGET_URL=https://bcv.org.ve
   ```
   - Solo funciona si el sitio permite iframes
   - Puede tener problemas de CORS

3. **Servidor Local**
   ```bash
   SCREEN_TARGET_URL=http://10.1.100.249:8000/
   ```
   - Para servidores en la red local
   - Puede requerir configuración de CORS

## 📋 Campos de la Base de Datos

| Campo | Tipo Browser | Tipo DLNA | Descripción |
|-------|-------------|-----------|-------------|
| `name` | ✅ Requerido | ✅ Requerido | Nombre identificativo del TV |
| `ip_address` | ⚪ Opcional | ✅ Requerido | IP del TV en la red |
| `device_type` | `browser` | `dlna` | Tipo de dispositivo |
| `socket_id` | 🔄 Automático | ❌ No usado | ID de conexión Socket.io |
| `is_active` | ✅ Requerido | ✅ Requerido | Estado activo/inactivo |

## 🎯 Casos de Uso

### **Caso 1: TV Samsung mostrando tasa de cambio**
```
1. Crear pantalla tipo "browser"
2. IP: Dejar vacío (no es necesario)
3. Abrir en el TV: http://servidor:4000/screens/viewer/1
4. El TV carga automáticamente la tasa
5. Desde admin: Click en "Recargar Tasa" para actualizar
```

### **Caso 2: TV LG reproduciendo videos**
```
1. Crear pantalla tipo "dlna"
2. IP: 10.20.10.89 (IP del TV en la red)
3. Colocar videos en public/media
4. Desde admin: Seleccionar video y click "Reproducir"
5. El TV reproduce automáticamente
```

## 🔍 Monitoreo

### **Socket ID en Televisores Browser**
- Se actualiza automáticamente cuando el TV se conecta
- Puedes ver el socket_id actual en la base de datos
- Si es `NULL`, el TV no está conectado actualmente
- Útil para debugging y monitoreo de conexiones

### **IP en Televisores Browser**
- Campo opcional para referencia
- Útil para saber dónde está físicamente el TV
- No afecta el funcionamiento del sistema
- Puedes dejarlo vacío sin problemas

## 🚀 Proxy Configuration

El proxy está configurado en `src/app.ts` para reescribir URLs y evitar problemas de seguridad del navegador.

**Target actual del proxy**: `http://10.1.100.249:8000`

Para cambiar el target, modifica la línea 57 en `src/app.ts`:
```typescript
target: 'http://TU_SERVIDOR:PUERTO',
```

## ⚡ Comandos Útiles

```bash
# Ver pantallas conectadas actualmente
SELECT id, name, device_type, socket_id FROM branch_screens WHERE socket_id IS NOT NULL;

# Limpiar socket_ids de pantallas desconectadas
UPDATE branch_screens SET socket_id = NULL WHERE device_type = 'browser';
```
