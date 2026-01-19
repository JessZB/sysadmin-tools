const d = document;

// Formateador para el Estado (Badge)
function statusFormatter(value, row, index) {
    if (value === 1 || value === true) {
        return '<span class="badge status-success-custom"><i class="bi bi-check-circle"></i> Activo</span>';
    } else {
        return '<span class="badge status-idle"><i class="bi bi-x-circle"></i> Inactivo</span>';
    }
}

// Formateador para el Tipo (Badge)
function typeFormatter(value, row, index) {
    if (value === 1 || value === true) {
        return '<span class="badge badge-cerulean"><i class="bi bi-server"></i> Servidor</span>';
    } else {
        return '<span class="badge badge-frosted"><i class="bi bi-pc-display"></i> Caja</span>';
    }
}

// Formateador para Botones de Acción
function actionFormatter(value, row, index) {
    // Botón Editar
    const isServer = (row.is_server === 1 || row.is_server === true) ? 1 : 0;
    const isActive = (row.is_active === 1 || row.is_active === true) ? 1 : 0;
    const branchId = row.branch_id || 1;
    
    let botones = `
        <button class="btn btn-sm btn-outline-cerulean me-1 btn-edit" 
            data-id="${row.id}"
            data-name="${row.name}"
            data-ip="${row.ip_address}"
            data-user="${row.db_user}"
            data-server="${isServer}"
            data-active="${isActive}"
            data-branch="${branchId}">
            <i class="bi bi-pencil"></i>
        </button>
    `;

    // Botón Eliminar
    botones += `
        <button class="btn btn-sm btn-outline-punch btn-delete" 
            data-id="${row.id}">
            <i class="bi bi-trash"></i>
        </button>
    `;

    return '<div class="text-end">' + botones + '</div>';
}

// Hacer globales las funciones para que Bootstrap Table las encuentre en el HTML
window.statusFormatter = statusFormatter;
window.typeFormatter = typeFormatter;
window.actionFormatter = actionFormatter;

d.addEventListener('DOMContentLoaded', () => {
    const modalEl = d.getElementById('modalTerminal');
    const modal = new bootstrap.Modal(modalEl);

    // --- EVENT LISTENERS ---

    // 1. Botón Nueva Terminal
    const btnNewTerminal = d.getElementById('btnNewTerminal');
    if (btnNewTerminal) {
        btnNewTerminal.addEventListener('click', abrirModalCrear);
    }

    // 2. Botón Guardar Terminal
    const btnSaveTerminal = d.getElementById('btnSaveTerminal');
    if (btnSaveTerminal) {
        btnSaveTerminal.addEventListener('click', guardarTerminal);
    }

    // 3. Delegación de eventos para la tabla
    const tablaTerminales = d.getElementById('tablaTerminales');
    if (tablaTerminales) {
        tablaTerminales.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('btn-edit')) {
                const { id, name, ip, user, server, active, branch } = target.dataset;
                abrirModalEditar(id, name, ip, user, server, active, branch);
            } else if (target.classList.contains('btn-delete')) {
                const { id } = target.dataset;
                eliminarTerminal(id);
            }
        });
    }

    // 4. Checkbox Force Blank
    const forceBlank = d.getElementById('forceBlankPassword');
    if (forceBlank) {
        forceBlank.addEventListener('change', function() {
            const passInput = d.getElementById('db_pass');
            if (this.checked) {
                passInput.value = '';
                passInput.disabled = true;
                passInput.placeholder = "Contraseña se guardará vacía";
            } else {
                passInput.disabled = false;
                passInput.placeholder = "Dejar vacío para no cambiar";
            }
        });
    }

    // --- FUNCIONES ---

    function abrirModalCrear() {
        d.getElementById('modalTitulo').innerText = 'Nueva Terminal POS';
        d.getElementById('terminalId').value = ''; // ID vacío = Crear
        d.getElementById('formTerminal').reset();
        
        // Resetear campos específicos
        d.getElementById('type').value = "0";
        d.getElementById('is_active').value = "1"; // Activa por defecto
        d.getElementById('branchId').value = d.getElementById('branchId').options[0].value; // Primera sucursal
        d.getElementById('divForceBlank').style.display = 'none';
        d.getElementById('forceBlankPassword').checked = false;
        d.getElementById('db_pass').disabled = false;
        d.getElementById('db_pass').placeholder = "Contraseña";
        
        d.getElementById('passHelp').innerText = 'Opcional (puede dejarse vacío).';
        d.getElementById('db_pass').required = false;
        modal.show();
    }

    function abrirModalEditar(id, name, ip_address, db_user, is_server, is_active, branch_id) {
        d.getElementById('modalTitulo').innerText = 'Editar Terminal';
        d.getElementById('terminalId').value = id;
        d.getElementById('name').value = name;
        d.getElementById('ip_address').value = ip_address;
        d.getElementById('db_user').value = db_user;
        
        // Setear tipo
        d.getElementById('type').value = is_server == "1" ? "1" : "0";
        
        // Setear estado
        d.getElementById('is_active').value = is_active == "1" ? "1" : "0";
        
        // Setear sucursal
        d.getElementById('branchId').value = branch_id || 1;
        
        // Configurar contraseña
        d.getElementById('db_pass').value = ''; // Limpiar contraseña
        d.getElementById('divForceBlank').style.display = 'block';
        d.getElementById('forceBlankPassword').checked = false;
        d.getElementById('db_pass').disabled = false;
        d.getElementById('db_pass').placeholder = "Dejar vacío para no cambiar";
        
        d.getElementById('passHelp').innerText = 'Dejar vacío para mantener la actual.';
        d.getElementById('db_pass').required = false;
        modal.show();
    }

    async function guardarTerminal() {
        const id = d.getElementById('terminalId').value;
        const name = d.getElementById('name').value;
        const ip_address = d.getElementById('ip_address').value;
        const db_user = d.getElementById('db_user').value;
        const db_pass = d.getElementById('db_pass').value;
        const typeVal = d.getElementById('type').value;
        const is_server = typeVal === "1";
        const is_active = Number(d.getElementById('is_active').value);
        const branch_id = Number(d.getElementById('branchId').value);
        const forceBlankPassword = d.getElementById('forceBlankPassword').checked;

        // Validación básica
        if (!name) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');
        if (!ip_address) return Swal.fire('Error', 'La dirección IP es obligatoria', 'warning');
        if (!db_user) return Swal.fire('Error', 'El usuario de BD es obligatorio', 'warning');

        const url = id ? `/terminals/${id}` : '/terminals';
        const method = id ? 'PUT' : 'POST';
        
        const payload = { 
            name, 
            ip_address, 
            db_user, 
            db_pass, 
            is_server,
            is_active,
            branch_id,
            forceBlankPassword 
        };

        try {
            // Bloqueamos pantalla mientras procesa
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

            // Cerramos el loading inmediatamente
            Swal.close();

            if (result.success) {
                modal.hide();
                showSuccessToast('Terminal guardada correctamente');
                $('#tablaTerminales').bootstrapTable('refresh');
            } else {
                showErrorToast(result.error || 'Error desconocido');
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión con el servidor');
        }
    }

    async function eliminarTerminal(id) {
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) return;

        try {
            Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });

            const response = await fetch(`/terminals/${id}`, { method: 'DELETE' });
            const result = await response.json();

            if (result.success) {
                showSuccessToast('La terminal ha sido eliminada');
                $('#tablaTerminales').bootstrapTable('refresh');
            } else {
                showErrorToast(result.error);
            }
        } catch (error) {
            Swal.close();
            showErrorToast('Error al intentar eliminar');
        }
    }
});
