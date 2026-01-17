const API_URL = 'http://localhost:4000/api/pos-jobs'; // Tu Backend
let terminalActualId = null;
const d = document;

// 1. Cargar lista de cajas al iniciar
d.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/terminals`);
        const result = await response.json();
        
        if (result.success) {
            renderizarCajas(result.data);
        }

        // Event Delegation for Jobs Table
        const tablaJobs = d.getElementById('tabla-jobs');
        if (tablaJobs) {
            tablaJobs.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                if (btn.classList.contains('btn-execute')) {
                    const jobName = btn.dataset.job;
                    ejecutarJob(jobName);
                }
            });
        }

    } catch (error) {
        console.error('Error cargando cajas:', error);
        alert('Error conectando con el servidor Backend');
    }
});

// 2. Renderizar la lista lateral
function renderizarCajas(cajas) {
    const contenedor = d.getElementById('lista-cajas');
    contenedor.innerHTML = '';

    cajas.forEach(caja => {
        const item = d.createElement('button');
        item.className = 'list-group-item list-group-item-action cursor-pointer';
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${caja.name}</h6>
            </div>
            <small class="text-muted">${caja.ip_address}</small>
        `;
        
        item.addEventListener('click', () => seleccionarCaja(caja, item));
        contenedor.appendChild(item);
    });
}

// 3. Seleccionar caja y cargar jobs
function seleccionarCaja(caja, elementoHtml) {
    // Manejo visual de "activo"
    d.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
    elementoHtml.classList.add('active');

    // Actualizar estado global
    terminalActualId = caja.id;
    d.getElementById('titulo-detalle').innerText = `Jobs en: ${caja.name}`;
    d.getElementById('btn-refresh').classList.remove('d-none'); // Mostrar botón refrescar

    cargarJobsActuales();
}

// 4. Obtener Jobs del Backend
async function cargarJobsActuales() {
    if (!terminalActualId) return;

    const tbody = d.getElementById('tabla-jobs');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando datos de SQL Server... <div class="spinner-border spinner-border-sm"></div></td></tr>';

    try {
        const response = await fetch(`${API_URL}/terminals/${terminalActualId}/jobs`);
        const result = await response.json();

        renderizarTablaJobs(result.data);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión con la caja</td></tr>`;
    }
}

// 5. Renderizar la tabla de jobs
function renderizarTablaJobs(jobs) {
    const tbody = d.getElementById('tabla-jobs');
    tbody.innerHTML = '';

    jobs.forEach(job => {
        let badgeClass = 'bg-secondary';
        let icon = '';
        let btnDisabled = '';

        // Lógica de colores según estado
        switch (job.LastStatus) {
            case 'Exitoso':
                badgeClass = 'bg-success';
                icon = '<i class="bi bi-check-circle"></i>';
                break;
            case 'Fallido':
                badgeClass = 'bg-danger';
                icon = '<i class="bi bi-x-circle"></i>';
                break;
            case 'En Ejecución':
                badgeClass = 'bg-primary';
                icon = '<i class="bi bi-gear-wide-connected spin-anim"></i>'; // Icono girando
                btnDisabled = 'disabled'; // No permitir ejecutar si ya corre
                break;
            case 'Cancelado':
                badgeClass = 'bg-warning text-dark';
                break;
        }

        const tr = d.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge ${badgeClass}">${icon} ${job.LastStatus}</span></td>
            <td class="fw-bold">${job.JobName}</td>
            <td>${job.LastRunDate ? new Date(job.LastRunDate).toLocaleString() : '-'}</td>
            <td class="small text-muted text-truncate" style="max-width: 200px;">${job.LastMessage || ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-dark btn-execute" 
                    data-job="${job.JobName}" ${btnDisabled}>
                    <i class="bi bi-play-fill"></i> Ejecutar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 6. Ejecutar Job
async function ejecutarJob(jobName) {
    if (!confirm(`¿Estás seguro de iniciar el job "${jobName}" en la caja seleccionada?`)) return;

    try {
        // Mostrar feedback inmediato
        alert(`Solicitud enviada para: ${jobName}. La tabla se actualizará en breve.`);
        
        const response = await fetch(`${API_URL}/terminals/${terminalActualId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobName })
        });
        
        const result = await response.json();

        if (result.success) {
            // Recargamos la tabla para ver el estado "En Ejecución"
            setTimeout(cargarJobsActuales, 1000); 
        } else {
            alert('Error: ' + (result.error || 'Desconocido'));
        }

    } catch (error) {
        console.error(error);
        alert('Error de red al intentar ejecutar el job');
    }
}

// Función global para refrescar desde el botón del HTML
window.cargarJobsActuales = cargarJobsActuales;