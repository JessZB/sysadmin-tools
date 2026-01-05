let refreshInterval;
let timeLeft = 300; // 5 minutos en segundos
let isPaused = false;
let isCoolingDown = false;
let currentBranchFilter = ''; // Variable global para el filtro
let currentTerminalIdForModal = null;
const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));

// Almacén temporal de datos
let globalTerminalsCache = []; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Intentar cargar lista de sucursales (Si el elemento existe, es porque soy admin)
    const selector = document.getElementById('branchSelector');
    if (selector) {
        cargarSelectorSucursales();
    }
    iniciarTemporizador();
    cargarDatos(); 

    const modalEl = document.getElementById('detailsModal');
    modalEl.addEventListener('show.bs.modal', () => { isPaused = true; });
    modalEl.addEventListener('hidden.bs.modal', () => { isPaused = false; });
});

/* =========================================
   LÓGICA DEL TEMPORIZADOR
   ========================================= */
function iniciarTemporizador() {
    const timerBadge = document.getElementById('countdownTimer');
    
    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerBadge.innerText = `${m}:${s}`;
            
            if (timeLeft < 60) timerBadge.className = 'badge bg-warning text-dark border timer-badge';
            else timerBadge.className = 'badge bg-light text-dark border timer-badge';

            if (timeLeft <= 0) {
                forzarRefrescoTotal();
            }
        }
    }, 1000);
}

function forzarRefrescoTotal() {
    if (isCoolingDown) return;
    timeLeft = 300;
    cargarDatos();
    iniciarCooldownBoton();
}

function iniciarCooldownBoton() {
    const btn = document.getElementById('btnGlobalRefresh');
    if (!btn) return;

    isCoolingDown = true;
    btn.disabled = true;
    const originalContent = '<i class="fa-solid fa-arrows-rotate me-1"></i> Refrescar';
    let secondsLeft = 10;

    const updateText = () => {
        btn.innerHTML = `<i class="fa-solid fa-hourglass-half me-1"></i> Espere ${secondsLeft}s`;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    };

    updateText();
    const interval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(interval);
            isCoolingDown = false;
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        } else {
            updateText();
        }
    }, 1000);
}

function toggleTimer() {
    isPaused = !isPaused;
    const badge = document.getElementById('countdownTimer');
    badge.style.opacity = isPaused ? '0.5' : '1';
    badge.title = isPaused ? "PAUSADO" : "Click para pausar";
}

// Función para llenar el Select
async function cargarSelectorSucursales() {
    try {
        const res = await fetch('/dashboard/api/branches'); // Nueva ruta creada en paso 4
        const result = await res.json();
        if (result.success) {
            const selector = document.getElementById('branchSelector');
            result.data.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                selector.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error cargando sucursales"); }
}

// Evento onchange del Select
function cambiarSucursal() {
    const selector = document.getElementById('branchSelector');
    const value = selector.value;
    
   
    
    // Si es 'all', mostramos todas las sucursales (sin filtro)
    if (value === 'all') {
        currentBranchFilter = ''; // Sin filtro = todas
    } else {
        // Es un ID de sucursal específico
        currentBranchFilter = value;
    }

    // Si es vacío (no seleccionado), no hacemos nada
    if (!value) {
        currentBranchFilter = '';
        // No recargamos, dejamos el estado actual
        return;
    }else{
         // Forzamos recarga inmediata
        forzarRefrescoTotal(); 
    }
   
}


/* =========================================
   CARGA DE DATOS (Centralizada)
   ========================================= */
async function cargarDatos() {
    const serverGrid = document.getElementById('server-grid');
    const posGrid = document.getElementById('pos-grid');
    const serverMatrix = document.getElementById('server-matrix');
    const posMatrix = document.getElementById('matrix-grid');
    
    if(globalTerminalsCache.length === 0) {
        posGrid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>';
    }

    try {
       let url = '/dashboard/api/terminals';
        if (currentBranchFilter) {
            url += `?branchId=${currentBranchFilter}`;
        }
        const res = await fetch(url);
        const result = await res.json();
        
        globalTerminalsCache = result.data;
        const servers = globalTerminalsCache.filter(t => t.is_server === 1); 
        const terminals = globalTerminalsCache.filter(t => t.is_server === 0);
        
        terminals.sort((a, b) => a.name.localeCompare(b.name));

        serverGrid.innerHTML = ''; posGrid.innerHTML = '';
        serverMatrix.innerHTML = ''; 
        posMatrix.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Cargando...</td></tr>';

        if (servers.length === 0) serverGrid.innerHTML = '<div class="col-12 text-muted small fst-italic">No hay servidores configurados.</div>';
        
        servers.forEach(srv => {
            serverGrid.appendChild(crearTarjetaServidorHTML(srv));
            serverMatrix.appendChild(crearTablaMatrizHTML(srv, 'col-12'));
        });

        if (terminals.length === 0) posGrid.innerHTML = '<div class="col-12 text-muted small fst-italic">No hay cajas registradas.</div>';
        
        terminals.forEach(term => {
            posGrid.appendChild(crearTarjetaHTML(term));
        });

        globalTerminalsCache.forEach(term => {
            consultarCajaIndividual(term.id);
        });

    } catch (error) {
        showErrorToast('Error inicializando dashboard');
        console.error(error);
    }
}

function crearTarjetaServidorHTML(term) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4'; 
    col.innerHTML = `
        <div class="pos-card status-loading server-card" id="card-${term.id}">
            <div class="d-flex w-100 h-100 align-items-center px-4 position-relative">
                <div class="me-4" id="icon-${term.id}" style="font-size: 2.5rem;">
                    <i class="fa-solid fa-circle-notch fa-spin text-white opacity-75"></i>
                </div>
                <div class="flex-grow-1" style="z-index: 2;">
                    <h5 class="fw-bold mb-1 text-white">${term.name}</h5>
                    <div class="d-flex align-items-center mb-2 text-white opacity-90">
                        <i class="fa-solid fa-network-wired me-2 small"></i>
                        <span class="font-monospace">${term.ip_address}</span>
                    </div>
                    <span class="badge bg-white bg-opacity-25 text-white border border-white border-opacity-50 fw-semibold">
                        MASTER NODE
                    </span>
                </div>
                <i class="fa-solid fa-server server-icon-large text-white opacity-10"></i>
                <div class="hover-overlay" style="border-radius: 10px;">
                    <button class="view-details-btn shadow" onclick="abrirModalDetalle(${term.id}, '${term.name}', '${term.ip_address}', true)">
                        <i class="fa-solid fa-eye me-1"></i> Gestionar Jobs
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Cargar tasas de cambio para esta terminal servidor
    const cardElement = col.querySelector('.pos-card');
    loadCurrencyBadges(term.id, cardElement);
    
    return col;
}

/* =========================================
   CONSULTA INDIVIDUAL
   ========================================= */
async function consultarCajaIndividual(id) {
    marcarCargaVisual(id); 
    try {
        const res = await fetch(`/dashboard/api/terminals/${id}/jobs`);
        const result = await res.json();

        if(result.success) {
            const jobs = result.data;
            const serverTime = result.serverTime;
            const estadoGlobal = calcularEstadoGlobal(jobs);

            actualizarTarjetaVisual(id, estadoGlobal);
            renderizarFilasMatriz(id, jobs, serverTime);

        } else {
            marcarErrorVisual(id);
        }
    } catch (error) {
        marcarErrorVisual(id);
    }
}

/* =========================================
   TAB 1: TARJETAS GRID
   ========================================= */
function crearTarjetaHTML(term) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-2';
    col.innerHTML = `
        <div class="pos-card status-loading" id="card-${term.id}">
            <div class="pos-icon" id="icon-${term.id}"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
            <h5 class="m-0 fw-bold">${term.name}</h5>
            <small class="d-block opacity-75">${term.ip_address}</small>
            <div class="hover-overlay">
                <button class="view-details-btn shadow" onclick="abrirModalDetalle(${term.id}, '${term.name}', '${term.ip_address}', true)">
                    <i class="fa-solid fa-eye me-1"></i> Ver Detalles
                </button>
            </div>
        </div>
    `;
    
    // Cargar tasas de cambio para esta terminal
    const cardElement = col.querySelector('.pos-card');
    loadCurrencyBadges(term.id, cardElement);
    
    return col;
}

function actualizarTarjetaVisual(id, status) {
    const card = document.getElementById(`card-${id}`);
    const iconContainer = document.getElementById(`icon-${id}`);
    if(!card) return;

    card.className = `pos-card status-${status}`;
    let icon = 'fa-circle-check';
    if(status === 'error') icon = 'fa-triangle-exclamation';
    if(status === 'warning') icon = 'fa-clock-rotate-left';
    iconContainer.innerHTML = `<i class="fa-solid ${icon}"></i>`;
}

/* =========================================
   TAB 2: MATRIZ DETALLADA
   ========================================= */
function crearTablaMatrizHTML(term, colClass = 'col-12 col-md-6', cardClass = '') {
    const col = document.createElement('div');
    col.className = colClass;
    col.innerHTML = `
        <div class="card shadow-none border-0 h-100 ${cardClass}">
            <div class="card-header d-flex justify-content-between align-items-center bg-light">
                <strong>${term.name}</strong>
                <button class="btn btn-sm btn-link text-decoration-none" onclick="consultarCajaIndividual(${term.id})">
                    <i class="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            <div class="card-body p-0 table-responsive">
                <table class="table table-sm mb-0 mini-job-table table-bordered table-hover">
                    <thead class="table-light small text-muted text-center">
                        <tr>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Ejecución</th>
                            <th>Última ejecución</th>
                            <th>Duración</th>
                            <th>Inicio</th>
                        </tr>
                    </thead>
                    <tbody id="matrix-tbody-${term.id}">
                        <tr><td colspan="6" class="text-center py-3 text-muted">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    return col;
}

function renderizarFilasMatriz(id, jobs, serverTime) {
    const terminal = globalTerminalsCache.find(t => t.id === id);
    if (!terminal) return;
    
    // IMPORTANTE: Detectamos si es servidor
    const isServer = terminal.is_server === 1;
    
    // Lógica para SERVIDOR (Matriz individual)
    if (isServer) {
        const tbody = document.getElementById(`matrix-tbody-${id}`);
        if (!tbody) return;
        tbody.innerHTML = '';
        
        jobs.sort((a, b) => a.JobName.localeCompare(b.JobName)).forEach(job => {
            const row = crearFilaJob(job, serverTime, '', isServer);
            tbody.appendChild(row);
        });
        return;
    }
    
    // Lógica para TERMINALES (Matriz compartida)
    const matrixGrid = document.getElementById('matrix-grid');
    if(!matrixGrid) return;
    
    const terminalName = terminal.name;
    const loadingRow = matrixGrid.querySelector('td[colspan="7"]');
    if (loadingRow) loadingRow.parentElement.remove();
    
    const existingRows = matrixGrid.querySelectorAll(`tr[data-terminal-id="${id}"]`);
    existingRows.forEach(row => row.remove());

    const newRows = [];
    jobs.sort((a, b) => a.JobName.localeCompare(b.JobName)).forEach((job, index) => {
        const terminalCell = index === 0 
            ? `<td rowspan="${jobs.length}" class="align-middle fw-bold text-center bg-light">${terminalName}</td>`
            : '';

        // Pasamos isServer (0) para que use formatDateRaw
        const row = crearFilaJob(job, serverTime, terminalCell, 0); 
        row.setAttribute('data-terminal-id', id);
        row.setAttribute('data-terminal-name', terminalName);
        newRows.push(row);
    });
    
    const allTerminalRows = Array.from(matrixGrid.querySelectorAll('tr[data-terminal-name]'));
    
    if (allTerminalRows.length === 0) {
        newRows.forEach(row => matrixGrid.appendChild(row));
    } else {
        let insertBeforeRow = null;
        for (const existingRow of allTerminalRows) {
            const existingName = existingRow.getAttribute('data-terminal-name');
            if (terminalName.localeCompare(existingName) < 0) {
                insertBeforeRow = existingRow;
                break;
            }
        }
        if (insertBeforeRow) {
            newRows.forEach(row => matrixGrid.insertBefore(row, insertBeforeRow));
        } else {
            newRows.forEach(row => matrixGrid.appendChild(row));
        }
    }
}

// Función auxiliar para crear una fila de job
function crearFilaJob(job, serverTime, terminalCellHTML = '', isServer = false) {
    let outcomeBadge = 'bg-secondary';
    if (job.LastOutcome === 'Exitoso') outcomeBadge = 'bg-success';
    else if (job.LastOutcome === 'Fallido') outcomeBadge = 'bg-danger';
    else if (job.LastOutcome === 'Cancelado') outcomeBadge = 'bg-warning text-dark';
    
    let execBadge = 'bg-secondary';
    let execText = 'Stopped';
    if (job.ExecutionStatus === 'Running') { execBadge = 'bg-warning text-dark'; execText = 'En ejecución'; }
    else if (job.ExecutionStatus === 'Idle') { execBadge = 'bg-light text-dark border'; execText = 'Detenido'; }

    // --- SELECCIÓN DE FORMATEO DE FECHA ---
    // Si es Servidor -> formatDateToLocal (ajustar zona horaria)
    // Si es Caja -> formatDateRaw (mantener números originales)
    let lastRunDateFmt = '||';
    if (job.LastRunDate) {
        const fmtFunc = isServer ? window.formatDateToLocal : window.formatDateRaw;
        const formattedDate = fmtFunc(job.LastRunDate);

        const parts = formattedDate.split(',');
        if (parts.length >= 2) {
            lastRunDateFmt = `${parts[0].trim()} || ${parts[1].trim()}`;
        } else {
            lastRunDateFmt = formattedDate;
        }
    }
    
    const duration = calcularDuracion(job.LastRunDate, serverTime, job.ExecutionStatus, job.LastDuration, isServer);

    let startTime = '-';
    if (job.ExecutionStatus === 'Running' && job.LastRunDate) {
         const fmtFunc = isServer ? window.formatDateToLocal : window.formatDateRaw;
         const parts = fmtFunc(job.LastRunDate).split(',');
         if(parts.length >= 2) startTime = parts[1].trim();
    }

    const isOld = esFechaAntigua(job.LastRunDate, serverTime, isServer);
    const rowClass = (isOld && job.ExecutionStatus !== 'Running') ? 'table-warning' : '';
    const dateWarningIcon = (isOld && job.ExecutionStatus !== 'Running') 
        ? '<i class="fa-solid fa-calendar-xmark text-danger me-1" title="Ejecutado en día distinto al actual"></i>' 
        : '';

    const row = document.createElement('tr');
    row.className = `mini-job-row small align-middle ${rowClass}`;
    row.innerHTML = `
        ${terminalCellHTML}
        <td class="text-truncate" style="max-width: 200px;" title="${job.JobName}">
            ${job.JobName}
        </td>
        <td class="text-center">
            <span class="badge ${outcomeBadge} w-100">${job.LastOutcome || 'Desc.'}</span>
        </td>
        <td class="text-center">
            <span class="badge ${execBadge} w-100">${execText}</span>
        </td>
        <td class="text-center small ${isOld ? 'fw-bold text-dark' : 'text-muted'}">
            ${dateWarningIcon} ${lastRunDateFmt}
        </td>
        <td class="text-center font-monospace small">
            ${duration}
        </td>
        <td class="text-center text-muted small">
            ${startTime}
        </td>
    `;
    return row;
}

function marcarCargaVisual(id) {
    const card = document.getElementById(`card-${id}`);
    const iconContainer = document.getElementById(`icon-${id}`);
    
    if (card && iconContainer) {
        card.classList.remove('status-success', 'status-warning', 'status-error');
        card.classList.add('status-loading');
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-secondary"></i>';
    }

    const tbody = document.getElementById(`matrix-tbody-${id}`);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i></td></tr>`;
    }
}

/* =========================================
   MODAL Y LÓGICA "VER MÁS"
   ========================================= */
async function abrirModalDetalle(id, name, ip, forceRefresh = false) {
    currentTerminalIdForModal = id;
    const modalHeader = document.getElementById('modalHeader');
    detailsModal.show();
    modalHeader.className = 'modal-header header-loading';
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('modalIp').innerText = ip;
    document.getElementById('modalId').innerText = `ID: ${id}`;
    document.getElementById('jobsTableBody').innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div><br>Actualizando datos en tiempo real...</td></tr>';

    if (forceRefresh) {
        consultarCajaIndividual(id).then(() => llenarModalConFetch(id));
    } else {
        llenarModalConFetch(id);
    }
}

async function llenarModalConFetch(id) {
    try {
        const res = await fetch(`/dashboard/api/terminals/${id}/jobs`);
        const result = await res.json();
        
        if(result.success) {
            const jobs = result.data;
            const serverTime = result.serverTime;
            const status = calcularEstadoGlobal(jobs);
            
            const terminal = globalTerminalsCache.find(t => t.id === id);
            const isServer = terminal ? (terminal.is_server === 1) : false;
            
            const header = document.getElementById('modalHeader');
            header.className = `modal-header header-${status}`;
            
            const tbody = document.getElementById('jobsTableBody');
            tbody.innerHTML = '';
            
            jobs.sort((a, b) => a.JobName.localeCompare(b.JobName)).forEach(job => {
                let badgeClass = 'bg-secondary';
                let icon = '';
                if (job.LastOutcome === 'Exitoso') { badgeClass = 'bg-success'; icon = '<i class="fa-solid fa-check"></i>'; }
                if (job.LastOutcome === 'Fallido') { badgeClass = 'bg-danger'; icon = '<i class="fa-solid fa-xmark"></i>'; }
                if (job.ExecutionStatus === 'Running') { badgeClass = 'bg-warning text-dark'; icon = '<i class="fa-solid fa-gear fa-spin"></i>'; }

                const duration = calcularDuracion(job.LastRunDate, serverTime, job.ExecutionStatus, job.LastDuration, isServer);
                
                // --- SELECCIÓN DE FORMATEO DE FECHA ---
                const fmtFunc = isServer ? window.formatDateToLocal : window.formatDateRaw;
                const fechaFmt = fmtFunc(job.LastRunDate); 
                
                const rawMsg = job.LastMessage || '';
                const safeMsg = rawMsg.replace(/"/g, '&quot;'); 
                const displayStatus = job.ExecutionStatus === 'Running' ? 'En Ejecución' : job.LastOutcome;
                const isOld = esFechaAntigua(job.LastRunDate, serverTime, isServer);
                const rowStyle = (isOld && job.ExecutionStatus !== 'Running') ? 'background-color: #fff3cd;' : '';
                const dateStyle = (isOld && job.ExecutionStatus !== 'Running') ? 'color: #856404; font-weight: bold;' : 'color: #6c757d;';
                const dateIcon = (isOld && job.ExecutionStatus !== 'Running') ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : '';

                let actionButtons = '';
                const btnPlayDisabled = job.ExecutionStatus === 'Running' ? 'disabled' : '';
                actionButtons += `<button class="btn btn-sm btn-outline-success me-1" ${btnPlayDisabled} title="Ejecutar" onclick="ejecutarJobDesdeModal('${job.JobName}')"><i class="fa-solid fa-play"></i></button>`;
                
                if (job.ExecutionStatus === 'Running') {
                    actionButtons += `<button class="btn btn-sm btn-outline-danger me-1" title="Detener forzosamente" onclick="detenerJobDesdeModal('${job.JobName}')"><i class="fa-solid fa-stop"></i></button>`;
                }
                actionButtons += `<button class="btn btn-sm btn-outline-primary" title="Ver Historial" onclick="verHistorialJob('${job.JobName}')"><i class="fa-solid fa-clock-rotate-left"></i></button>`;

                tbody.innerHTML += `
                    <tr style="${rowStyle}">
                        <td><span class="badge ${badgeClass}">${icon} ${displayStatus}</span></td>
                        <td class="fw-bold">${job.JobName}</td>
                        <td>
                            <div class="small fw-bold">${duration}</div>
                            <div style="font-size:0.75rem; ${dateStyle}">
                                ${dateIcon}${fechaFmt}
                            </div>
                        </td>
                        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: help;" title="${safeMsg}">
                            ${rawMsg}
                        </td>
                        <td class="text-end text-nowrap">
                            ${actionButtons}
                        </td>
                    </tr>
                `;
            });
            
            // Cargar tasas de cambio para mostrar en el modal
            loadCurrencyDetails(id);
        }
    } catch (e) { console.error(e); }
}

function calcularEstadoGlobal(jobs) {
    if(!jobs || jobs.length === 0) return 'warning';
    if(jobs.some(j => j.ExecutionStatus === 'Running')) return 'warning';
    if(jobs.some(j => j.LastOutcome === 'Fallido')) return 'error';
    return 'success';
}

function esFechaAntigua(jobDateStr, serverTimeStr, isServer = false) {
    if (!jobDateStr || !serverTimeStr) return false;
    let d1Str = !isServer ? jobDateStr.replace(/Z$/, '') : jobDateStr;
    let d2Str = !isServer ? serverTimeStr.replace(/Z$/, '') : serverTimeStr;
    const jobDate = new Date(d1Str);
    const serverDate = new Date(d2Str);
    return jobDate.toDateString() !== serverDate.toDateString();
}

function marcarErrorVisual(id) {
    actualizarTarjetaVisual(id, 'error');
    const tbody = document.getElementById(`matrix-tbody-${id}`);
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center"><small>Error de conexión</small></td></tr>';
}

function calcularDuracion(startDateStr, serverDateStr, executionStatus, lastDurationStr, isServer = false) {
    if (executionStatus !== 'Running') {
        return lastDurationStr || '00:00:00';
    }
    if (!startDateStr || !serverDateStr) return 'Calculando...';

    let start, nowServer;
    
    if (!isServer) {
        const s1 = startDateStr.replace(/Z$/, '');
        const s2 = serverDateStr.replace(/Z$/, '');
        start = new Date(s1);
        nowServer = new Date(s2);
    } else {
        start = new Date(startDateStr);
        nowServer = new Date(serverDateStr);
    }

    let diff = nowServer - start;
    if (diff < 0) diff = 0; 

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');

    return `<span class="text-primary fw-bold"><i class="fa-solid fa-stopwatch me-1"></i> ${hStr}:${mStr}:${sStr}</span>`;
}

/* =========================================
   ACCIÓN: EJECUTAR JOB DESDE EL MODAL
   ========================================= */
window.ejecutarJobDesdeModal = async (jobName) => {
    // Validación de seguridad
    if (!currentTerminalIdForModal) {
        showErrorToast('No se ha identificado la terminal actual.');
        return;
    }

    // 1. Confirmación con SweetAlert
    const confirm = await Swal.fire({
        title: '¿Ejecutar Job?',
        html: `Vas a iniciar el proceso: <strong>${jobName}</strong><br>en la terminal ID: <strong>${currentTerminalIdForModal}</strong>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, iniciar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
        // 2. Feedback inmediato (Toast)
        showInfoToast('Enviando orden al servidor...');

        // 3. Petición al Backend
        const res = await fetch(`/dashboard/api/terminals/${currentTerminalIdForModal}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobName })
        });

        const result = await res.json();

        if (result.success) {
            showSuccessToast('Job iniciado correctamente');

            // 4. ACTUALIZACIÓN INTELIGENTE
            // Esperamos 2 segundos para dar tiempo a SQL Server Agent de poner el job en "Running"
            // y luego refrescamos tanto el modal como la tarjeta de fondo.
            
            const btnRefresh = document.getElementById('modalTitle'); // Usamos el título como referencia visual
            if(btnRefresh) btnRefresh.innerHTML += ' <span class="spinner-border spinner-border-sm"></span>';

            setTimeout(() => {
                // Actualiza la tarjeta del Grid y la fila de la Matriz (Tab 1 y 2)
                consultarCajaIndividual(currentTerminalIdForModal);
                
                // Actualiza la tabla del Modal que tienes abierto ahora mismo
                llenarModalConFetch(currentTerminalIdForModal);
            }, 2000);

        } else {
            showErrorToast(result.error || 'Error al intentar iniciar el job');
        }

    } catch (error) {
        console.error(error);
        showErrorToast('Error de comunicación con el servidor');
    }
};

/* =========================================
   ACCIÓN: DETENER JOB
   ========================================= */
window.detenerJobDesdeModal = async (jobName) => {
    const confirm = await Swal.fire({
        title: '¿Detener Job?',
        html: `Vas a forzar la detención de: <strong>${jobName}</strong>.<br><span class="text-danger small">Esto puede dejar procesos inconclusos.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, detener',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
        showInfoToast('Enviando orden de parada...');

        const res = await fetch(`/dashboard/api/terminals/${currentTerminalIdForModal}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobName })
        });

        const result = await res.json();

        if (result.success) {
            showSuccessToast('Job detenido');
            // Recarga rápida para reflejar cambio
            setTimeout(() => {
                consultarCajaIndividual(currentTerminalIdForModal);
                llenarModalConFetch(currentTerminalIdForModal);
            }, 1500);
        } else {
            showErrorToast(result.error);
        }
    } catch (error) {
        showErrorToast('Error de comunicación');
    }
};

/* =========================================
   ACCIÓN: VER HISTORIAL
   ========================================= */
const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));

window.verHistorialJob = async (jobName) => {
    // 1. Abrir modal
    historyModal.show();
    
    // UI Inicial
    document.getElementById('historyJobTitle').innerText = jobName;
    document.getElementById('historyTerminalName').innerText = `ID Terminal: ${currentTerminalIdForModal}`;
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        // 2. Fetch
        // Usamos encodeURIComponent por si el jobName tiene espacios o caracteres raros
        const res = await fetch(`/dashboard/api/terminals/${currentTerminalIdForModal}/history?name=${encodeURIComponent(jobName)}`);
        const result = await res.json();

        if (result.success) {
            tbody.innerHTML = '';
            const history = result.data;

            if (history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin historial reciente.</td></tr>';
                return;
            }

            history.forEach(h => {
                let badge = 'bg-secondary';
                if(h.StatusText === 'Exitoso') badge = 'bg-success';
                else if(h.StatusText === 'Fallido') badge = 'bg-danger';
                
                // Formatear fecha
                const dateFmt = formatDateRaw(h.RunDate);

                tbody.innerHTML += `
                    <tr>
                        <td style="font-size:0.85rem">${dateFmt}</td>
                        <td><span class="badge ${badge}">${h.StatusText}</span></td>
                        <td class="font-monospace small">${h.Duration}</td>
                        <td class="small text-muted text-truncate" style="max-width: 200px;" title="${h.message}">
                            ${h.message}
                        </td>
                    </tr>
                `;
            });

        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">${result.error}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Error obteniendo historial</td></tr>';
    }
};

/* =========================================
   CURRENCY RATES - TASAS DE CAMBIO
   ========================================= */

/**
 * Carga y muestra los badges de tasas de cambio en una card de terminal
 */
async function loadCurrencyBadges(terminalId, cardElement) {
    try {
        const response = await fetch(`/terminals/currencies/${terminalId}`);
        const currencies = await response.json();
        
        // Mapeo de iconos y colores por código de moneda
        const currencyConfig = {
            '0000000003': { icon: 'bi-currency-euro', color: 'bg-primary', label: 'EUR' },
            '0000000002': { icon: 'bi-currency-dollar', color: 'bg-success', label: 'USD' },
            'TFSM': { icon: 'bi-credit-card', color: 'bg-dark', label: 'T.Forum' },
            'CXC': { icon: 'bi-receipt', color: 'bg-warning text-dark', label: 'CxC' }
        };
        
        const badgesHTML = currencies.map(curr => {
            const config = currencyConfig[curr.c_codmoneda] || { icon: 'bi-cash', color: 'bg-secondary', label: curr.c_codmoneda };
            return `
                <span class="badge ${config.color}">
                    <i class="bi ${config.icon}"></i> ${config.label}: ${curr.n_factor.toFixed(2)}
                </span>
            `;
        }).join('');
        
        // Buscar o crear el contenedor de badges
        let badgesContainer = cardElement.querySelector('.currency-badges');
        if (!badgesContainer) {
            badgesContainer = document.createElement('div');
            badgesContainer.className = 'currency-badges';
            cardElement.appendChild(badgesContainer);
        }
        
        badgesContainer.innerHTML = badgesHTML;
    } catch (error) {
        console.error('Error loading currencies:', error);
        // Mostrar mensaje de error discreto
        let badgesContainer = cardElement.querySelector('.currency-badges');
        if (!badgesContainer) {
            badgesContainer = document.createElement('div');
            badgesContainer.className = 'currency-badges';
            cardElement.appendChild(badgesContainer);
        }
        badgesContainer.innerHTML = '<span class="badge bg-secondary"><i class="bi bi-exclamation-triangle"></i> N/D</span>';
    }
}

/**
 * Carga y muestra la tabla de tasas de cambio en el modal de detalles
 */
async function loadCurrencyDetails(terminalId) {
    try {
        const response = await fetch(`/terminals/currencies/${terminalId}`);
        const currencies = await response.json();
        
        // Buscar o crear la sección de tasas en el modal
        let currencySection = document.getElementById('currencySection');
        if (!currencySection) {
            // Crear la sección si no existe
            const modalBody = document.querySelector('#detailsModal .modal-body');
            currencySection = document.createElement('div');
            currencySection.id = 'currencySection';
            currencySection.className = 'mt-4';
            currencySection.innerHTML = `
                <h6 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-currency-exchange me-2"></i>Tasas de Cambio
                </h6>
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Código</th>
                            <th>Moneda</th>
                            <th class="text-end">Factor</th>
                            <th>Símbolo</th>
                        </tr>
                    </thead>
                    <tbody id="currencyTableBody"></tbody>
                </table>
            `;
            modalBody.appendChild(currencySection);
        }
        
        const tbody = document.getElementById('currencyTableBody');
        tbody.innerHTML = currencies.map(curr => `
            <tr>
                <td><code>${curr.c_codmoneda}</code></td>
                <td>${curr.c_descripcion}</td>
                <td class="text-end fw-bold">${curr.n_factor.toFixed(2)}</td>
                <td>${curr.c_simbolo}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading currency details:', error);
    }
}