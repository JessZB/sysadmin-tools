/* =========================================
   SERVICES MONITORING - CLIENT SIDE (BOOTSTRAP TABS)
   ========================================= */

const d = document;
let modalServicio;
let modalHistorial;
let currentCategory = 'todos';
let currentBranchId = null;
let userRole = null;
let userBranchId = null;
let servicesDataByCategory = {
    todos: [],
    servicios: [],
    terminales: [],
    balanzas: [],
    otros: []
};
let pingInProgress = new Set();
let activePingControllers = new Map(); // category -> AbortController
let categoryPingInProgress = new Set(); // Set of categories with active pings
let serviceAbortControllers = new Map(); // serviceId -> AbortController for individual pings

d.addEventListener('DOMContentLoaded', function() {
    modalServicio = new bootstrap.Modal(d.getElementById('modalServicio'));
    modalHistorial = new bootstrap.Modal(d.getElementById('modalHistorial'));
    
    // Obtener datos del usuario
    userRole = window.currentUser?.role || 'analista';
    userBranchId = window.currentUser?.branch_id;
    
    // --- EVENT LISTENERS ---

    // 1. Botón Ping Todos
    const btnPingAll = d.getElementById('btnPingAll');
    if (btnPingAll) {
        btnPingAll.addEventListener('click', pingAll);
    }

    // 1.1 Botón Cancelar Todos
    const btnCancelAll = d.getElementById('btnCancelAll');
    if (btnCancelAll) {
        btnCancelAll.addEventListener('click', cancelAll);
    }

    // 2. Botón Nuevo Servicio
    const btnNewService = d.getElementById('btnNewService');
    if (btnNewService) {
        btnNewService.addEventListener('click', abrirModalCrear);
    }

    // 3. Botón Guardar Servicio
    const btnSaveService = d.getElementById('btnSaveService');
    if (btnSaveService) {
        btnSaveService.addEventListener('click', guardarServicio);
    }

    // 4. Delegación de eventos para el contenido de las pestañas (Grid y Acciones de Sección)
    const tabContent = d.getElementById('categoryTabContent');
    if (tabContent) {
        tabContent.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) {
                // Manejar click en "Añadir Servicio" card (que no es un botón)
                const addCard = e.target.closest('.add-service-card');
                if (addCard) {
                    abrirModalCrear();
                }
                return;
            }

            // --- Botones de Servicio (Cards) ---
            if (btn.classList.contains('btn-ping')) {
                pingServiceAsync(Number(btn.dataset.id));
            } else if (btn.classList.contains('btn-cancel-overlay')) {
                cancelServicePing(Number(btn.dataset.id));
            } else if (btn.classList.contains('btn-history')) {
                verHistorial(Number(btn.dataset.id), btn.dataset.name);
            } else if (btn.classList.contains('btn-edit')) {
                abrirModalEditar(Number(btn.dataset.id));
            } else if (btn.classList.contains('btn-delete')) {
                eliminarServicio(Number(btn.dataset.id), btn.dataset.name);
            }
            
            // --- Botones de Sección (Header de Tab) ---
            else if (btn.classList.contains('btn-ping-section')) {
                pingSection(btn.dataset.category);
            } else if (btn.classList.contains('btn-cancel-ping')) {
                cancelPing(btn.dataset.category);
            }
        });
    }
    
    // 5. Event listener para cambio de tabs (Bootstrap)
    const tabElements = d.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElements.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const category = event.target.getAttribute('data-category');
            onTabChange(category);
        });
    });
    
    // 6. Event listener para cambio de sucursal
    const branchSelect = d.getElementById('branchSelect');
    if (branchSelect) {
        branchSelect.addEventListener('change', function() {
            currentBranchId = parseInt(this.value);
            loadServicesByCategory('terminales');
        });
    }
    
    // Cargar categoría inicial
    loadServicesByCategory('todos');
});

/* =========================================
   SECTION PING AND CANCEL
   ========================================= */

/**
 * Ping all services in a specific category/section
 */
async function pingSection(category) {
    if (categoryPingInProgress.has(category)) {
        showInfoToast('Ya hay un ping en progreso para esta sección');
        return;
    }
    
    const services = servicesDataByCategory[category];
    if (!services || services.length === 0) {
        showInfoToast('No hay servicios en esta sección');
        return;
    }
    
    // Create abort controller for this category
    const controller = new AbortController();
    activePingControllers.set(category, controller);
    categoryPingInProgress.add(category);
    
    // Show cancel button, disable ping button
    toggleCategoryPingUI(category, true);
    
    showInfoToast(`Iniciando ping a ${services.length} servicio(s) en ${getCategoryDisplayName(category)}...`);
    
    let completedCount = 0;
    let successCount = 0;
    
    try {
        // Ping services sequentially to avoid overwhelming the server
        for (const service of services) {
            if (controller.signal.aborted) {
                showInfoToast(`Ping cancelado (${completedCount}/${services.length} completados)`);
                break;
            }
            
            try {
                await pingServiceAsync(service.id, controller.signal);
                completedCount++;
                
                // Check if it was successful
                const updatedService = servicesDataByCategory[category].find(s => s.id === service.id);
                if (updatedService && updatedService.last_status === 1) {
                    successCount++;
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error; // Re-throw to break the loop
                }
                // Continue with next service on error
                completedCount++;
            }
        }
        
        if (!controller.signal.aborted) {
            showSuccessToast(`Ping completado: ${successCount}/${completedCount} servicios disponibles`);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error en ping de sección:', error);
            showErrorToast('Error durante el ping de la sección');
        }
    } finally {
        // Cleanup
        activePingControllers.delete(category);
        categoryPingInProgress.delete(category);
        toggleCategoryPingUI(category, false);
    }
}

/**
 * Cancel ongoing ping for a category
 */
function cancelPing(category) {
    const controller = activePingControllers.get(category);
    if (controller) {
        controller.abort();
        showInfoToast('Cancelando ping...');
    }
}

/**
 * Toggle UI elements for category ping state
 */
function toggleCategoryPingUI(category, isPinging) {
    const pingBtn = d.querySelector(`.btn-ping-section[data-category="${category}"]`);
    const cancelBtn = d.querySelector(`.btn-cancel-ping[data-category="${category}"]`);
    
    if (pingBtn) {
        pingBtn.disabled = isPinging;
        pingBtn.innerHTML = isPinging 
            ? '<i class="bi bi-hourglass-split"></i> Ejecutando...'
            : '<i class="bi bi-broadcast-pin"></i> Ping Esta Sección';
    }
    
    if (cancelBtn) {
        if (isPinging) {
            cancelBtn.classList.remove('d-none');
        } else {
            cancelBtn.classList.add('d-none');
        }
    }
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(category) {
    const names = {
        'todos': 'Todos los Servicios',
        'servicios': 'Servicios',
        'terminales': 'Terminales',
        'balanzas': 'Balanzas',
        'otros': 'Otros'
    };
    return names[category] || category;
}

/**
 * Cancel ongoing ping for an individual service
 */
function cancelServicePing(serviceId) {
    const controller = serviceAbortControllers.get(serviceId);
    if (controller) {
        controller.abort();
        showInfoToast('Ping cancelado');
    }
}



/**
 * Cancel all ongoing pings (global ping operation)
 */
function cancelAll() {
    const controller = activePingControllers.get('global');
    if (controller) {
        controller.abort();
        showInfoToast('Cancelando todos los pings...');
    }
}

/* =========================================
   TAB CHANGE HANDLER
   ========================================= */

function onTabChange(category) {
    currentCategory = category;
    
    // Mostrar/ocultar selector de sucursales
    const branchSelector = d.getElementById('branchSelector');
    if (category === 'terminales' && userRole === 'admin') {
        branchSelector.style.display = 'block';
        if (!currentBranchId) {
            loadBranches();
        }
    } else {
        branchSelector.style.display = 'none';
    }
    
    // Controlar botón "Nuevo Servicio"
    const newServiceBtn = d.getElementById('btnNewService');
    if (newServiceBtn) {
        if (category === 'terminales') {
            newServiceBtn.disabled = true;
            newServiceBtn.title = 'Las terminales se gestionan desde el módulo de Terminales';
        } else if (category === 'todos') {
            newServiceBtn.disabled = true;
            newServiceBtn.title = 'Selecciona una categoría específica para crear un servicio';
        } else {
            newServiceBtn.disabled = false;
            newServiceBtn.title = '';
        }
    }
    
    // Cargar servicios si no están cargados
    if (servicesDataByCategory[category].length === 0) {
        loadServicesByCategory(category);
    }
}

/* =========================================
   LOAD AND RENDER SERVICES
   ========================================= */

async function loadServicesByCategory(category) {
    try {
        let url;
        
        if (category === 'todos') {
            url = '/services/data';
        } else {
            url = `/services/category/${category}`;
            
            if (category === 'terminales' && currentBranchId) {
                url += `?branch_id=${currentBranchId}`;
            }
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        servicesDataByCategory[category] = data;
        renderServicesGrid(category, data);
        
        // Actualizar stats solo si es "todos"
        if (category === 'todos') {
            updateStats(data);
        }
    } catch (error) {
        console.error('Error loading services:', error);
        showErrorToast('Error al cargar servicios');
    }
}

function renderServicesGrid(category, services) {
    const grid = d.getElementById(`servicesGrid-${category}`);
    
    if (services.length === 0) {
        showEmptyMessage(grid, category);
        return;
    }
    
    const cards = services.map(service => createServiceCard(service, category)).join('');
    const addCard = (category !== 'todos' && category !== 'terminales') ? createAddServiceCard(category) : '';
    
    grid.innerHTML = cards + addCard;
}

function showEmptyMessage(grid, category) {
    let message = 'No hay servicios registrados en esta categoría.';
    
    if (category === 'terminales') {
        message = 'No hay terminales registradas para esta sucursal.';
    }
    
    grid.innerHTML = `
        <div class="col-12 text-center py-5">
            <i class="fa-solid fa-inbox fa-3x text-muted mb-3"></i>
            <p class="text-muted">${message}</p>
        </div>
    `;
}

function createServiceCard(service, viewCategory) {
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
            <button class="btn btn-sm btn-danger mt-2 btn-cancel-overlay" data-id="${service.id}">
                <i class="bi bi-x-circle"></i> Cancelar
            </button>
        </div>
    ` : '';
    
    const isTerminal = service.category === 'terminales';
    const disableEdit = isTerminal ? 'disabled title="Editar desde módulo Terminales"' : '';
    const disableDelete = isTerminal ? 'disabled title="Eliminar desde módulo Terminales"' : '';
    
    // Badge de categoría solo en vista "Todos"
    const categoryBadge = viewCategory === 'todos' ? `
        <span class="category-badge category-${service.category}">
            ${getCategoryLabel(service.category)}
        </span>
    ` : '';
    
    return `
        <article class="service-card ${status.class}" id="service-card-${service.id}">
            <div class="card-status-line"></div>
            ${loadingOverlay}
            ${categoryBadge}
            
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
                <button class="action-btn-small btn-ping" data-id="${service.id}" title="Ping" ${isLoading ? 'disabled' : ''}>
                    <i class="bi bi-broadcast"></i> Ping
                </button>
                <button class="action-btn-small btn-history" data-id="${service.id}" data-name="${escapeHtml(service.name)}" title="Historial">
                    <i class="bi bi-clock-history"></i>
                </button>
                <button class="action-btn-small btn-edit" data-id="${service.id}" title="Editar" ${disableEdit}>
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn-small btn-delete" data-id="${service.id}" data-name="${escapeHtml(service.name)}" title="Eliminar" ${disableDelete}>
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </article>
    `;
}

function createAddServiceCard(category) {
    return `
        <article class="service-card add-service-card">
            <div class="add-content">
                <i class="bi bi-plus-circle"></i>
                <p>Añadir Servicio</p>
            </div>
        </article>
    `;
}

function getCategoryLabel(category) {
    const labels = {
        'servicios': 'Servicio',
        'terminales': 'Terminal',
        'balanzas': 'Balanza',
        'otros': 'Otro'
    };
    return labels[category] || category;
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
    
    d.getElementById('statTotal').textContent = total;
    d.getElementById('statOnline').textContent = online;
    d.getElementById('statOffline').textContent = offline;
    d.getElementById('statUnknown').textContent = unknown;
}

/* =========================================
   BRANCHES (ADMIN)
   ========================================= */

async function loadBranches() {
    try {
        const response = await fetch('/services/branches');
        const branches = await response.json();
        
        const select = d.getElementById('branchSelect');
        select.innerHTML = branches.map(b => 
            `<option value="${b.id}" ${b.id === userBranchId ? 'selected' : ''}>${b.name}</option>`
        ).join('');
        
        currentBranchId = parseInt(select.value);
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

/* =========================================
   UPDATE SINGLE CARD
   ========================================= */

function updateSingleCard(serviceId) {
    // Buscar el servicio en todas las categorías y actualizar en cada grid donde aparezca
    for (const [category, services] of Object.entries(servicesDataByCategory)) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            // Buscar la card en el grid de esta categoría
            const grid = d.getElementById(`servicesGrid-${category}`);
            if (grid) {
                const cardElement = grid.querySelector(`#service-card-${serviceId}`);
                if (cardElement) {
                    const newCard = createServiceCard(service, category);
                    const tempDiv = d.createElement('div');
                    tempDiv.innerHTML = newCard;
                    cardElement.replaceWith(tempDiv.firstElementChild);
                }
            }
        }
    }
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
    d.getElementById('modalTitulo').textContent = 'Nuevo Servicio';
    d.getElementById('formServicio').reset();
    d.getElementById('servicioId').value = '';
    d.getElementById('activo').checked = true;
    modalServicio.show();
}

async function abrirModalEditar(id) {
    try {
        // Buscar servicio en todas las categorías
        let servicio = null;
        for (const services of Object.values(servicesDataByCategory)) {
            servicio = services.find(s => s.id === id);
            if (servicio) break;
        }
        
        if (!servicio) {
            showErrorToast('Servicio no encontrado');
            return;
        }
        
        d.getElementById('modalTitulo').textContent = 'Editar Servicio';
        d.getElementById('servicioId').value = servicio.id;
        d.getElementById('nombre').value = servicio.name;
        d.getElementById('host').value = servicio.host;
        d.getElementById('tipo').value = servicio.type;
        d.getElementById('categoria').value = servicio.category || 'servicios';
        d.getElementById('descripcion').value = servicio.description || '';
        d.getElementById('activo').checked = servicio.is_active === 1;
        
        modalServicio.show();
    } catch (error) {
        console.error('Error:', error);
        showErrorToast('Error al cargar servicio');
    }
}

async function guardarServicio() {
    const id = d.getElementById('servicioId').value;
    const data = {
        name: d.getElementById('nombre').value,
        host: d.getElementById('host').value,
        type: d.getElementById('tipo').value,
        category: d.getElementById('categoria').value,
        description: d.getElementById('descripcion').value,
        is_active: d.getElementById('activo').checked ? 1 : 0
    };
    
    if (!data.name || !data.host) {
        showInfoToast('Complete los campos requeridos');
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
            
            // Recargar categorías afectadas
            loadServicesByCategory('todos');
            loadServicesByCategory(data.category);
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
            // Recargar todas las categorías
            loadServicesByCategory('todos');
            loadServicesByCategory(currentCategory);
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

/**
 * Ping a single service (updated to support AbortSignal)
 */
async function pingServiceAsync(id, signal = null) {
    if (pingInProgress.has(id)) {
        return;
    }
    
    // Create AbortController for individual ping if no signal provided
    let controller = null;
    if (!signal) {
        controller = new AbortController();
        serviceAbortControllers.set(id, controller);
        signal = controller.signal;
    }
    
    try {
        showLoadingState(id);
        
        const fetchOptions = {
            method: 'POST',
            signal: signal
        };
        
        const response = await fetch(`/services/ping/${id}`, fetchOptions);
        const data = await response.json();
        
        if (data.success) {
            // Actualizar datos del servicio en todas las categorías
            for (const [category, services] of Object.entries(servicesDataByCategory)) {
                const serviceIndex = services.findIndex(s => s.id === id);
                if (serviceIndex !== -1) {
                    const result = data.result;
                    servicesDataByCategory[category][serviceIndex].last_status = result.alive ? 1 : 0;
                    servicesDataByCategory[category][serviceIndex].last_response_time = result.avg;
                    servicesDataByCategory[category][serviceIndex].last_checked_at = new Date().toISOString();
                }
            }
            
            hideLoadingState(id);
            
            // Actualizar stats si estamos en "todos"
            if (currentCategory === 'todos') {
                updateStats(servicesDataByCategory.todos);
            }
            
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
        if (error.name === 'AbortError') {
            hideLoadingState(id);
            return; // No relanzar para evitar "Uncaught (in promise)"
        }
        console.error('Error:', error);
        hideLoadingState(id);
        showErrorToast('Error de conexión');
    } finally {
        // Cleanup: remove AbortController
        if (serviceAbortControllers.has(id)) {
            serviceAbortControllers.delete(id);
        }
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
    
    const serviceIds = servicesDataByCategory.todos.map(s => s.id);
    
    // Crear AbortController global
    const globalController = new AbortController();
    activePingControllers.set('global', globalController);
    
    // Mostrar botón de cancelar todos
    const btnCancelAll = d.getElementById('btnCancelAll');
    const btnPingAll = d.getElementById('btnPingAll');
    if (btnCancelAll) btnCancelAll.classList.remove('d-none');
    if (btnPingAll) btnPingAll.disabled = true;
    
    showInfoToast(`Ejecutando ping a ${serviceIds.length} servicio(s)...`);
    
    try {
        // Ejecutar pings secuencialmente para permitir cancelación
        for (const id of serviceIds) {
            if (globalController.signal.aborted) {
                showInfoToast('Ping global cancelado');
                break;
            }
            try {
                await pingServiceAsync(id, globalController.signal);
            } catch (error) {
                if (error.name === 'AbortError') {
                    break;
                }
                // Continuar con el siguiente servicio si hay error
            }
        }
        
        if (!globalController.signal.aborted) {
            showSuccessToast('Pings completados');
        }
    } catch (error) {
        console.error('Error en ping batch:', error);
    } finally {
        // Cleanup
        activePingControllers.delete('global');
        if (btnCancelAll) btnCancelAll.classList.add('d-none');
        if (btnPingAll) btnPingAll.disabled = false;
    }
}

/* =========================================
   HISTORIAL
   ========================================= */

async function verHistorial(id, nombre) {
    d.getElementById('historialNombre').textContent = `Servicio: ${nombre}`;
    d.getElementById('historialBody').innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
    
    modalHistorial.show();
    
    try {
        const response = await fetch(`/services/history/${id}?limit=50`);
        const history = await response.json();
        
        if (history.length === 0) {
            d.getElementById('historialBody').innerHTML = 
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
        
        d.getElementById('historialBody').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        d.getElementById('historialBody').innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger">Error al cargar historial</td></tr>';
    }
}

/* =========================================
   UTILITY FUNCTIONS
   ========================================= */

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}
