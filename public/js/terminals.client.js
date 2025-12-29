// Formateador para el Estado (Badge)
function statusFormatter(value, row, index) {
    if (value === 1 || value === true) {
        return '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Activo</span>';
    } else {
        return '<span class="badge bg-secondary"><i class="bi bi-x-circle"></i> Inactivo</span>';
    }
}

// Formateador para el Tipo (Badge)
function typeFormatter(value, row, index) {
    if (value === 1 || value === true) {
        return '<span class="badge bg-primary"><i class="bi bi-server"></i> Servidor</span>';
    } else {
        return '<span class="badge bg-info text-dark"><i class="bi bi-pc-display"></i> Caja</span>';
    }
}

// Formateador para Botones de Acción
function actionFormatter(value, row, index) {
    // Botón Editar
    const isServer = (row.is_server === 1 || row.is_server === true) ? 1 : 0;
    const isActive = (row.is_active === 1 || row.is_active === true) ? 1 : 0;
    const branchId = row.branch_id || 1;
    
    let botones = `
        <button class="btn btn-sm btn-outline-primary me-1" 
            onclick="abrirModalEditar('${row.id}', '${row.name}', '${row.ip_address}', '${row.db_user}', ${isServer}, ${isActive}, ${branchId})">
            <i class="bi bi-pencil"></i>
        </button>
    `;

    // Botón Eliminar
    botones += `
        <button class="btn btn-sm btn-outline-danger" 
            onclick="eliminarTerminal('${row.id}')">
            <i class="bi bi-trash"></i>
        </button>
    `;

    return '<div class="text-end">' + botones + '</div>';
}

// Hacer globales las funciones para que Bootstrap Table las encuentre en el HTML
window.statusFormatter = statusFormatter;
window.typeFormatter = typeFormatter;
window.actionFormatter = actionFormatter;

const modalEl = document.getElementById('modalTerminal');
const modal = new bootstrap.Modal(modalEl);

// Event Listener para el checkbox de borrar contraseña
document.getElementById('forceBlankPassword').addEventListener('change', function() {
    const passInput = document.getElementById('db_pass');
    if (this.checked) {
        passInput.value = '';
        passInput.disabled = true;
        passInput.placeholder = "Contraseña se guardará vacía";
    } else {
        passInput.disabled = false;
        passInput.placeholder = "Dejar vacío para no cambiar";
    }
});

// 1. Abrir Modal para CREAR
function abrirModalCrear() {
    document.getElementById('modalTitulo').innerText = 'Nueva Terminal POS';
    document.getElementById('terminalId').value = ''; // ID vacío = Crear
    document.getElementById('formTerminal').reset();
    
    // Resetear campos específicos
    document.getElementById('type').value = "0";
    document.getElementById('is_active').value = "1"; // Activa por defecto
    document.getElementById('branchId').value = document.getElementById('branchId').options[0].value; // Primera sucursal
    document.getElementById('divForceBlank').style.display = 'none';
    document.getElementById('forceBlankPassword').checked = false;
    document.getElementById('db_pass').disabled = false;
    document.getElementById('db_pass').placeholder = "Contraseña";
    
    document.getElementById('passHelp').innerText = 'Opcional (puede dejarse vacío).';
    document.getElementById('db_pass').required = false;
    modal.show();
}

// 2. Abrir Modal para EDITAR
function abrirModalEditar(id, name, ip_address, db_user, is_server, is_active, branch_id) {
    document.getElementById('modalTitulo').innerText = 'Editar Terminal';
    document.getElementById('terminalId').value = id;
    document.getElementById('name').value = name;
    document.getElementById('ip_address').value = ip_address;
    document.getElementById('db_user').value = db_user;
    
    // Setear tipo
    document.getElementById('type').value = is_server ? "1" : "0";
    
    // Setear estado
    document.getElementById('is_active').value = is_active ? "1" : "0";
    
    // Setear sucursal
    document.getElementById('branchId').value = branch_id || 1;
    
    // Configurar contraseña
    document.getElementById('db_pass').value = ''; // Limpiar contraseña
    document.getElementById('divForceBlank').style.display = 'block';
    document.getElementById('forceBlankPassword').checked = false;
    document.getElementById('db_pass').disabled = false;
    document.getElementById('db_pass').placeholder = "Dejar vacío para no cambiar";
    
    document.getElementById('passHelp').innerText = 'Dejar vacío para mantener la actual.';
    document.getElementById('db_pass').required = false;
    modal.show();
}

// 3. Guardar (Create o Update)
async function guardarTerminal() {
    const id = document.getElementById('terminalId').value;
    const name = document.getElementById('name').value;
    const ip_address = document.getElementById('ip_address').value;
    const db_user = document.getElementById('db_user').value;
    const db_pass = document.getElementById('db_pass').value;
    const typeVal = document.getElementById('type').value;
    const is_server = typeVal === "1";
    const is_active = Number(document.getElementById('is_active').value);
    const branch_id = Number(document.getElementById('branchId').value);
    const forceBlankPassword = document.getElementById('forceBlankPassword').checked;

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
            // Ocultar modal y refrescar
            const modalEl = document.getElementById('modalTerminal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Mostrar toast de éxito
            showSuccessToast('Terminal guardada correctamente');

            // Recargar tabla
            $('#tablaTerminales').bootstrapTable('refresh');

        } else {
            // Mostrar toast de error
            showErrorToast(result.error || 'Error desconocido');
        }
    } catch (error) {
        Swal.close();
        console.error(error);
        showErrorToast('Error de conexión con el servidor');
    }
}

// 4. Eliminar con SweetAlert (Confirmación bonita)
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
            // Mostrar toast de éxito
            showSuccessToast('La terminal ha sido eliminada');

            // Refrescar tabla
            $('#tablaTerminales').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error);
        }
    } catch (error) {
        Swal.close();
        showErrorToast('Error al intentar eliminar');
    }
}
