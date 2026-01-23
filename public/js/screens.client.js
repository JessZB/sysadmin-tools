const d = document;

// ==========================================
// DELEGACIÓN DE EVENTOS
// ==========================================

d.addEventListener('DOMContentLoaded', () => {
    const modalEl = d.getElementById('modalScreen');
    const modal = new bootstrap.Modal(modalEl);
    let editMode = false;

    // --- EVENT LISTENERS ---

    // 1. Botón Nueva Pantalla
    const btnNewScreen = d.querySelector('[data-action="create-screen"]');
    if (btnNewScreen) {
        btnNewScreen.addEventListener('click', openCreateModal);
    }

    // 2. Botón Guardar
    const btnSave = d.getElementById('btnSave');
    if (btnSave) {
        btnSave.addEventListener('click', saveScreen);
    }

    // 3. Delegación de eventos para las cards
    const screensContainer = d.querySelector('.row');
    if (screensContainer) {
        screensContainer.addEventListener('click', handleCardActions);
    }

    // 4. Cambio de tipo de dispositivo
    const deviceTypeSelect = d.getElementById('deviceType');
    if (deviceTypeSelect) {
        deviceTypeSelect.addEventListener('change', toggleIpField);
    }

    // --- FUNCIONES ---

    /**
     * Maneja todos los clicks en las cards de pantallas
     */
    function handleCardActions(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        const screenId = target.dataset.id;

        switch (action) {
            case 'edit':
                editScreen(screenId);
                break;
            case 'delete':
                const screenName = target.dataset.name;
                deleteScreen(screenId, screenName);
                break;
            case 'reload':
                reloadScreen(screenId);
                break;
            case 'play':
                const screenIp = target.dataset.ip;
                playVideo(screenIp, screenId);
                break;
            case 'mute':
                controlMute(screenId);
                break;
            case 'power-off':
                controlPower(screenId, 'off');
                break;
            case 'power-on':
                controlPower(screenId, 'on');
                break;
            case 'startup':
                startupRoutine(screenId);
                break;
            case 'save-mac':
                saveMacAddress(screenId);
                break;
            case 'validate':
                validateConnection(screenId);
                break;
            case 'send-key':
                const key = target.dataset.key;
                const label = target.dataset.label;
                sendKey(screenId, key, label);
                break;
            case 'open-browser':
                openBrowser(screenId);
                break;
        }
    }

    /**
     * Abre el modal para crear una nueva pantalla
     */
    function openCreateModal() {
        editMode = false;
        d.getElementById('modalTitle').textContent = 'Nueva Pantalla';
        d.getElementById('formScreen').reset();
        d.getElementById('screenId').value = '';
        d.getElementById('isActive').checked = true;
        toggleIpField();
        modal.show();
    }

    /**
     * Carga los datos de una pantalla y abre el modal para editar
     */
    async function editScreen(id) {
        editMode = true;
        d.getElementById('modalTitle').textContent = 'Editar Pantalla';

        try {
            Swal.fire({
                title: 'Cargando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`/screens/${id}`);
            const result = await response.json();

            Swal.close();

            if (result.success) {
                const screen = result.data;
                d.getElementById('screenId').value = screen.id;
                d.getElementById('screenName').value = screen.name;
                d.getElementById('deviceType').value = screen.device_type;
                d.getElementById('ipAddress').value = screen.ip_address || '';
                d.getElementById('isActive').checked = screen.is_active === 1;
                toggleIpField();
                modal.show();
            } else {
                showErrorToast('No se pudo cargar la pantalla');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión al cargar la pantalla');
        }
    }

    /**
     * Guarda (crea o actualiza) una pantalla
     */
    async function saveScreen() {
        const id = d.getElementById('screenId').value;
        const name = d.getElementById('screenName').value;
        const deviceType = d.getElementById('deviceType').value;
        const ipAddress = d.getElementById('ipAddress').value;
        const isActive = d.getElementById('isActive').checked ? 1 : 0;

        // Validación
        if (!name) {
            return Swal.fire('Error', 'El nombre es obligatorio', 'warning');
        }

        if (deviceType === 'dlna' && !ipAddress) {
            return Swal.fire('Error', 'La dirección IP es obligatoria para dispositivos DLNA', 'warning');
        }

        const url = editMode && id ? `/screens/${id}` : '/screens/create';
        const method = editMode && id ? 'PUT' : 'POST';

        const payload = {
            name,
            device_type: deviceType,
            ip_address: ipAddress || null,
            is_active: isActive
        };

        try {
            Swal.fire({
                title: 'Guardando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                modal.hide();
                showSuccessToast(result.message);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showErrorToast(result.message || 'Error al guardar');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión con el servidor');
        }
    }

    /**
     * Elimina una pantalla
     */
    async function deleteScreen(id, name) {
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará la pantalla "${name}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Eliminando...',
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`/screens/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                showSuccessToast(result.message);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showErrorToast(result.message || 'Error al eliminar');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión al eliminar');
        }
    }

    /**
     * Envía comando de recarga a una pantalla vía Socket.io
     */
    async function reloadScreen(id) {
        try {
            const response = await fetch('/screens/reload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const result = await response.json();

            if (result.success) {
                showSuccessToast(result.message);
            } else {
                showErrorToast(result.message || 'Error al recargar');
            }
        } catch (error) {
            console.error(error);
            showErrorToast('Error de conexión al recargar');
        }
    }

    /**
     * Reproduce un video en un TV DLNA
     */
    async function playVideo(ip, screenId) {
        const select = d.getElementById(`media-${screenId}`);
        if (!select) return;

        const url = select.value;
        const finalUrl = url.replace('localhost:4000', window.location.hostname + ':4000');

        try {
            Swal.fire({
                title: 'Enviando...',
                text: 'Reproduciendo en el TV',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('/screens/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, url: finalUrl })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                showSuccessToast(result.message);
            } else {
                showErrorToast(result.message || 'Error al reproducir');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión al reproducir');
        }
    }

    /**
     * Muestra/oculta el campo IP según el tipo de dispositivo
     */
    function toggleIpField() {
        const type = d.getElementById('deviceType').value;
        const ipInput = d.getElementById('ipAddress');
        const ipRequired = d.getElementById('ipRequired');

        if (type === 'dlna') {
            ipInput.setAttribute('required', 'required');
            if (ipRequired) ipRequired.style.display = 'inline';
        } else {
            ipInput.removeAttribute('required');
            if (ipRequired) ipRequired.style.display = 'none';
        }
    }

    // ==========================================
    // SAMSUNG TV CONTROL FUNCTIONS
    // ==========================================

    /**
     * Control de encendido/apagado del TV Samsung
     */
    async function controlPower(id, action) {
        try {
            const actionText = action === 'on' ? 'Encendiendo' : 'Apagando';
            
            Swal.fire({
                title: `${actionText}...`,
                text: action === 'on' ? 'Esto puede tardar unos segundos' : 'Enviando comando',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('/screens/control/power', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                showSuccessToast(result.message);
            } else {
                showErrorToast(result.message || 'Error al controlar el TV');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión al controlar el TV');
        }
    }

    /**
     * Control de silencio del TV Samsung
     */
    async function controlMute(id) {
        try {
            const response = await fetch('/screens/control/mute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const result = await response.json();

            if (result.success) {
                showSuccessToast(result.message);
            } else {
                showErrorToast(result.message || 'Error al silenciar');
            }
        } catch (error) {
            console.error(error);
            showErrorToast('Error de conexión al silenciar');
        }
    }

    /**
     * Guardar dirección MAC del TV
     */
    async function saveMacAddress(id) {
        const macInput = d.getElementById(`mac-input-${id}`);
        if (!macInput) return;

        const mac = macInput.value.trim().toUpperCase();
        
        // Validar formato MAC
        const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
        if (!macRegex.test(mac)) {
            return Swal.fire({
                icon: 'warning',
                title: 'Formato inválido',
                text: 'La dirección MAC debe tener el formato AA:BB:CC:DD:EE:FF'
            });
        }

        try {
            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`/screens/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mac_address: mac })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                showSuccessToast('Dirección MAC guardada');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showErrorToast(result.message || 'Error al guardar MAC');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión');
        }
    }

    /**
     * Rutina de encendido automático
     */
    async function startupRoutine(id) {
        try {
            Swal.fire({
                title: '🚀 Iniciando rutina...',
                html: `
                    <div class="text-start">
                        <p>📡 Enviando señal de encendido...</p>
                        <p>⏳ Esperando respuesta del TV...</p>
                        <p>🌐 Abrirá el navegador automáticamente</p>
                        <hr>
                        <small class="text-muted">Esto puede tardar hasta 30 segundos</small>
                    </div>
                `,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('/screens/startup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: '✅ Rutina iniciada',
                    html: `
                        <p>${result.message}</p>
                        <hr>
                        <small class="text-muted">
                            El TV encenderá y abrirá el navegador automáticamente.<br>
                            Puedes cerrar esta ventana.
                        </small>
                    `,
                    timer: 5000,
                    timerProgressBar: true
                });
            } else {
                showErrorToast(result.message || 'Error al iniciar rutina');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión al iniciar rutina');
        }
    }

    /**
     * Validar conexión Samsung y obtener token
     */
    async function validateConnection(id) {
        try {
            Swal.fire({
                title: '🔌 Validando conexión...',
                html: '<p>Acepta la solicitud en el TV si aparece</p>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('/screens/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: '✅ Conexión validada',
                    html: `
                        <p>Token guardado correctamente</p>
                        <code>${result.token}</code>
                    `,
                    timer: 3000,
                    timerProgressBar: true
                });
                setTimeout(() => window.location.reload(), 3000);
            } else {
                showErrorToast(result.message);
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error validando conexión');
        }
    }

    /**
     * Enviar comando específico al TV
     */
    async function sendKey(id, key, label) {
        try {
            const response = await fetch('/screens/send-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, key })
            });

            const result = await response.json();

            if (result.success) {
                showSuccessToast(`${label} enviado`);
            } else {
                showErrorToast(result.message);
            }
        } catch (error) {
            console.error(error);
            showErrorToast('Error enviando comando');
        }
    }

    /**
     * Abrir navegador en el TV
     */
    async function openBrowser(id) {
        try {
            Swal.fire({
                title: '🌐 Abriendo navegador...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('/screens/open-browser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const result = await response.json();
            Swal.close();

            if (result.success) {
                showSuccessToast('Navegador abierto');
            } else {
                showErrorToast(result.message);
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error abriendo navegador');
        }
    }
});
