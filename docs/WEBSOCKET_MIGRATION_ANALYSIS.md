# Migración a WebSocket Nativo para Control Samsung TV

## Análisis de Scripts de Ejemplo

### `test-tv.js` - Conexión y Obtención de Token
```javascript
- URL: wss://{IP}:8002/api/v2/channels/samsung.remote.control?name={base64Name}&token={token}
- Evento: ms.channel.connect → response.data.token
- Certificado: rejectUnauthorized: false
```

### `test-open-browser.js` - Ejecución de Comandos
```javascript
- Enviar teclas: method: "ms.remote.control", params: { Cmd: "Click", DataOfCmd: key }
- Abrir navegador: POST http://{IP}:8001/api/v2/applications/org.tizen.browser
```

## Nuevo Flujo Propuesto

### 1. Crear/Editar Televisor
- Campos: nombre, IP, MAC, tipo (browser/dlna)
- Si es Samsung → Validar conexión automáticamente
- Guardar token si conexión exitosa

### 2. Re-validar Conexión
- Botón "Re-validar" para reconectar sin token
- Obtener nuevo token del TV
- Actualizar en BD

### 3. Panel de Control
- Botones estilo control remoto
- Acciones: Mute, Vol+, Vol-, Home, Return, Menu, etc.
- Botón "Abrir Navegador"
- Botón "Encender y Abrir Navegador" (WoL + espera 15s + abrir)

## Componentes a Modificar

### Backend

#### 1. `screens.service.ts`
- [ ] Eliminar dependencia de `samsung-tv-control`
- [ ] Crear función `connectWebSocket(ip, token?)` → retorna token
- [ ] Crear función `sendCommand(ip, token, key)`
- [ ] Crear función `openBrowser(ip)` → POST a puerto 8001
- [ ] Actualizar `startRoutine` para usar nuevas funciones

#### 2. `screens.controller.ts`
- [ ] Nuevo endpoint `POST /screens/validate` → conectar y obtener token
- [ ] Actualizar `controlPower`, `controlMute` para usar WebSocket
- [ ] Nuevo endpoint `POST /screens/send-key` → enviar tecla específica
- [ ] Nuevo endpoint `POST /screens/open-browser` → abrir navegador
- [ ] Actualizar `startupRoutine` → WoL + 15s + openBrowser

#### 3. `screens.routes.ts`
- [ ] Agregar ruta `/validate`
- [ ] Agregar ruta `/send-key`
- [ ] Agregar ruta `/open-browser`

### Frontend

#### 1. `screens.client.js`
- [ ] Función `validateConnection(id)` → muestra token capturado
- [ ] Función `sendKey(id, key)` → enviar comando específico
- [ ] Función `openBrowser(id)` → solo abrir navegador
- [ ] Actualizar `startupRoutine` → WoL + 15s + openBrowser

#### 2. `list.ejs`
- [ ] Indicador de estado de token (✅ Validado / ❌ Sin validar)
- [ ] Botón "Validar Conexión" / "Re-validar"
- [ ] Panel de control con botones:
  - Mute, Vol+, Vol-, Power
  - Home, Return, Menu
  - Flechas (Up, Down, Left, Right)
  - Enter
- [ ] Botón "Abrir Navegador"
- [ ] Botón "Encender y Abrir Navegador"

### Base de Datos
- Campo `samsung_token` ya existe ✅
- Agregar campo `token_validated_at` (opcional)

## Detalles Técnicos

### WebSocket Connection
```typescript
const WebSocket = require('ws');
const url = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${base64Name}${token ? '&token=' + token : ''}`;
const ws = new WebSocket(url, { rejectUnauthorized: false });
```

### Capturar Token
```typescript
ws.on('message', (data) => {
    const response = JSON.parse(data);
    if (response.event === "ms.channel.connect" && response.data?.token) {
        const newToken = response.data.token;
        // Guardar en BD
    }
});
```

### Enviar Comando
```typescript
const payload = JSON.stringify({
    method: "ms.remote.control",
    params: {
        Cmd: "Click",
        DataOfCmd: "KEY_MUTE",
        Option: "false",
        TypeOfRemote: "SendRemoteKey"
    }
});
ws.send(payload);
```

### Abrir Navegador
```typescript
const endpoint = `http://${ip}:8001/api/v2/applications/org.tizen.browser`;
await fetch(endpoint, { method: 'POST' });
```

## Ventajas de este Enfoque

✅ Control directo del WebSocket
✅ Sin dependencias externas problemáticas
✅ Mejor manejo de errores
✅ Token persistente en BD
✅ Más flexible para agregar comandos

## Comandos Disponibles

```
KEY_POWER, KEY_MUTE
KEY_VOLUP, KEY_VOLDOWN
KEY_HOME, KEY_RETURN, KEY_MENU
KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT
KEY_ENTER
KEY_0 - KEY_9
```
