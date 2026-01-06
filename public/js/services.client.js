/* =========================================
   SERVICES MONITORING - CLIENT SIDE (ASYNC UPDATES)
   ========================================= */

let modalServicio;
let modalHistorial;
let servicesData = [];
let pingInProgress = new Set(); // Track which services are being pinged

document.addEventListener('DOMContentLoaded', function() {
    modalServicio = new bootstrap.Modal(document.getElementById('modalServicio'));
    modalHistorial = new bootstrap.Modal(document.getElementById('modalHistorial'));
    
    // Cargar servicios al inicio
    loadServices();
    
    // Actualizar cada 30 segundos
    setInterval(loadServices, 30000);
});

/* =========================================
   LOAD AND RENDER SERVICES
   ========================================= */

async function loadServices() {
    try {
        const response = await fetch('/services/data');
        servicesData = await response.json();
        
        renderServicesGrid(servicesData);
        updateStats(servicesData);
    } catch (error) {
        console.error('Error loading services:', error);
        showErrorToast('Error al cargar servicios');
    }
}

function renderServicesGrid(services) {
    const grid = document.getElementById('servicesGrid');
    
    if (services.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-inbox fa-3x text-muted mb-3"></i>
                <p class="text-muted">No hay servicios registrados. Crea uno para comenzar.</p>
            </div>
        `;
        return;
    }
    
    const cards = services.map(service => createServiceCard(service)).join('');
    const addCard = createAddServiceCard();
    
    grid.innerHTML = cards + addCard;
}

function createServiceCard(service) {
    const status = getServiceStatus(service);
    const latency = service.last_response_time || 0;
    const lastChecked = service.last_checked_at 
        ? new Date(service.last_checked_at).toLocaleString('es-VE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Nunca';
    
    const isLoading = pingInProgress.has(service.id);
    const loadingOverlay = isLoading ? `
        <div class="card-loading-overlay">
            <div class="spinner"></div>
            <p>Ejecutando ping...</p>
        </div>
    ` : '';
    
    return `
        <article class="service-card ${status.class}" id="service-card-${service.id}">
            <div class="card-status-line"></div>
            ${loadingOverlay}
            
            <div class="card-header">
                <div class="service-info">
                    <h3>${escapeHtml(service.name)}</h3>
                    <span class="service-url">${escapeHtml(service.host)}</span>
                </div>
                <span class="status-pill">
                    <i class="${status.icon}"></i>
                    ${status.label}
                </span>
            </div>
            
            <p class="service-description">
                ${service.description || 'Sin descripción'}
            </p>
            
            <div class="card-metrics">
                <div class="metric">
                    <i class="bi bi-clock"></i>
                    <span>${latency > 0 ? latency + 'ms' : '-'}</span>
                </div>
                <div class="metric">
                    <i class="bi bi-calendar-check"></i>
                    <span style="font-size: 0.8rem;">${lastChecked}</span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="action-btn-small btn-ping" onclick="pingServiceAsync(${service.id})" title="Ping" ${isLoading ? 'disabled' : ''}>
                    <i class="bi bi-broadcast"></i> Ping
                </button>
                <button class="action-btn-small" onclick="verHistorial(${service.id}, '${escapeHtml(service.name)}')" title="Historial">
                    <i class="bi bi-clock-history"></i>
                </button>
                <button class="action-btn-small" onclick="abrirModalEditar(${service.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn-small btn-delete" onclick="eliminarServicio(${service.id}, '${escapeHtml(service.name)}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </article>
    `;
}

function createAddServiceCard() {
    return `
        <article class="service-card add-service-card" onclick="abrirModalCrear()">
            <div class="add-content">
                <i class="bi bi-plus-circle"></i>
                <p>Añadir Servicio</p>
            </div>
        </article>
    `;
}

function getServiceStatus(service) {
    if (!service.last_checked_at) {
        return { 
            class: 'status-unknown', 
            label: 'Sin verificar',
            icon: 'bi bi-question-circle'
        };
    }
    
    if (service.last_status === 1) {
        const latency = service.last_response_time || 0;
        if (latency < 100) {
            return { 
                class: 'status-up', 
                label: 'Online',
                icon: 'bi bi-check-circle'
            };
        } else {
            return { 
                class: 'status-slow', 
                label: 'Lento',
                icon: 'bi bi-exclamation-triangle'
            };
        }
    } else {
        return { 
            class: 'status-down', 
            label: 'Offline',
            icon: 'bi bi-x-circle'
        };
    }
}

function updateStats(services) {
    const total = services.length;
    const online = services.filter(s => s.last_status === 1 && s.last_response_time < 100).length;
    const offline = services.filter(s => s.last_status === 0).length;
    const unknown = services.filter(s => !s.last_checked_at).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statOnline').textContent = online;
    document.getElementById('statOffline').textContent = offline;
    document.getElementById('statUnknown').textContent = unknown;
}

/* =========================================
   UPDATE SINGLE CARD
   ========================================= */

function updateSingleCard(serviceId) {
    const service = servicesData.find(s => s.id === serviceId);
    if (!service) return;
    
    const cardElement = document.getElementById(`service-card-${serviceId}`);
    if (!cardElement) return;
    
    const newCard = createServiceCard(service);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newCard;
    
    cardElement.replaceWith(tempDiv.firstElementChild);
}

function showLoadingState(serviceId) {
    pingInProgress.add(serviceId);
    updateSingleCard(serviceId);
}

function hideLoadingState(serviceId) {
    pingInProgress.delete(serviceId);
    updateSingleCard(serviceId);
}

/* =========================================
   CRUD OPERATIONS
   ========================================= */

function abrirModalCrear() {
    document.getElementById('modalTitulo').textContent = 'Nuevo Servicio';
    document.getElementById('formServicio').reset();
    document.getElementById('servicioId').value = '';
    document.getElementById('activo').checked = true;
    modalServicio.show();
}

async function abrirModalEditar(id) {
    try {
        const servicio = servicesData.find(s => s.id === id);
        
        if (!servicio) {
            showErrorToast('Servicio no encontrado');
            return;
        }
        
        document.getElementById('modalTitulo').textContent = 'Editar Servicio';
        document.getElementById('servicioId').value = servicio.id;
        document.getElementById('nombre').value = servicio.name;
        document.getElementById('host').value = servicio.host;
        document.getElementById('tipo').value = servicio.type;
        document.getElementById('descripcion').value = servicio.description || '';
        document.getElementById('activo').checked = servicio.is_active === 1;
        
        modalServicio.show();
    } catch (error) {
        console.error('Error:', error);
        showErrorToast('Error al cargar servicio');
    }
}

async function guardarServicio() {
    const id = document.getElementById('servicioId').value;
    const data = {
        name: document.getElementById('nombre').value,
        host: document.getElementById('host').value,
        type: document.getElementById('tipo').value,
        description: document.getElementById('descripcion').value,
        is_active: document.getElementById('activo').checked ? 1 : 0
    };
    
    if (!data.name || !data.host) {
        showWarningToast('Complete los campos requeridos');
        return;
    }
    
    try {
        const url = id ? `/services/${id}` : '/services';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast(id ? 'Servicio actualizado' : 'Servicio creado');
            modalServicio.hide();
            loadServices();
        } else {
            showErrorToast(result.error || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorToast('Error de conexión');
    }
}

async function eliminarServicio(id, nombre) {
    const result = await Swal.fire({
        title: '¿Eliminar servicio?',
        html: `Se eliminará el servicio: <strong>${nombre}</strong><br>También se eliminará su historial de verificaciones.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e63946',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await fetch(`/services/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            showSuccessToast('Servicio eliminado');
            loadServices();
        } else {
            showErrorToast(data.error || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorToast('Error de conexión');
    }
}

/* =========================================
   PING OPERATIONS - ASYNC
   ========================================= */

async function pingServiceAsync(id) {
    if (pingInProgress.has(id)) {
        showWarningToast('Ya se está ejecutando un ping a este servicio');
        return;
    }
    
    try {
        showLoadingState(id);
        
        const response = await fetch(`/services/ping/${id}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            // Actualizar datos del servicio
            const serviceIndex = servicesData.findIndex(s => s.id === id);
            if (serviceIndex !== -1) {
                const result = data.result;
                servicesData[serviceIndex].last_status = result.alive ? 1 : 0;
                servicesData[serviceIndex].last_response_time = result.avg;
                servicesData[serviceIndex].last_checked_at = new Date().toISOString();
            }
            
            hideLoadingState(id);
            updateStats(servicesData);
            
            if (data.result.alive) {
                showSuccessToast(`Ping exitoso: ${data.result.avg}ms`);
            } else {
                showErrorToast('Servicio no disponible');
            }
        } else {
            hideLoadingState(id);
            showErrorToast(data.error || 'Error al ejecutar ping');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoadingState(id);
        showErrorToast('Error de conexión');
    }
}

async function pingAll() {
    const result = await Swal.fire({
        title: '¿Ping a todos los servicios?',
        text: 'Esto puede tardar varios segundos',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0dcaf0',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, ejecutar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    const serviceIds = servicesData.map(s => s.id);
    
    showInfoToast(`Ejecutando ping a ${serviceIds.length} servicio(s)...`);
    
    // Ejecutar pings en paralelo con actualización asíncrona
    const pingPromises = serviceIds.map(id => pingServiceAsync(id));
    
    try {
        await Promise.all(pingPromises);
        showSuccessToast('Pings completados');
    } catch (error) {
        console.error('Error en ping batch:', error);
    }
}

/* =========================================
   HISTORIAL
   ========================================= */

async function verHistorial(id, nombre) {
    document.getElementById('historialNombre').textContent = `Servicio: ${nombre}`;
    document.getElementById('historialBody').innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
    
    modalHistorial.show();
    
    try {
        const response = await fetch(`/services/history/${id}?limit=50`);
        const history = await response.json();
        
        if (history.length === 0) {
            document.getElementById('historialBody').innerHTML = 
                '<tr><td colspan="5" class="text-center text-muted">Sin verificaciones registradas</td></tr>';
            return;
        }
        
        const html = history.map(check => {
            const statusBadge = check.is_alive 
                ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> OK</span>'
                : '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Fallo</span>';
            
            const latency = check.response_time ? `${check.response_time}ms` : '-';
            const packetLoss = check.packet_loss || '-';
            const stats = check.min_time 
                ? `${check.min_time}/${check.max_time}/${check.avg_time}ms`
                : '-';
            
            const date = new Date(check.checked_at).toLocaleString('es-VE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${statusBadge}</td>
                    <td>${latency}</td>
                    <td>${packetLoss}</td>
                    <td><small>${stats}</small></td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('historialBody').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('historialBody').innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger">Error al cargar historial</td></tr>';
    }
}

/* =========================================
   UTILITY FUNCTIONS
   ========================================= */

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/* =========================================
   TOAST NOTIFICATIONS
   ========================================= */

function showSuccessToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#2e7d32",
    }).showToast();
}

function showErrorToast(message) {
    Toastify({
        text: message,
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "#e63946",
    }).showToast();
}

function showWarningToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#f57c00",
    }).showToast();
}

function showInfoToast(message) {
    Toastify({
        text: message,
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor: "#0dcaf0",
    }).showToast();
}
