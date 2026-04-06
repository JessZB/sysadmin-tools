const d = document;

// Formateador para el Rol (Badges)
function roleFormatter(value, row, index) {
    if (value === 'admin') {
        return '<span class="badge badge-punch">Administrador</span>';
    } else if (value === 'analista') {
        return '<span class="badge badge-cerulean">Analista</span>';
    } else {
        return '<span class="badge badge-frosted">Visualizador</span>';
    }
}

// Formateador para Fechas
function dateFormatter(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
}

// Formateador para Botones de Acción
function actionFormatter(value, row, index) {
    const modulesSafe = row.modules_str ? row.modules_str : '';
    const isCurrentUser = row.id === currentUserId;

    let botones = `
        <div class="table-action-group">
            <button class="btn btn-sm btn-edit" 
                title="Editar Datos"
                data-id="${row.id}"
                data-username="${row.username}"
                data-role="${row.role}"
                data-branch-id="${row.branch_id}">
                <i class="bi bi-pencil-square"></i>
            </button>

            <button class="btn btn-sm btn-permissions" 
                title="Gestionar Permisos"
                data-id="${row.id}"
                data-username="${row.username}"
                data-modules="${modulesSafe}">
                <i class="bi bi-shield-lock"></i>
            </button>
    `;

    // Botón Eliminar
    if (!isCurrentUser) {
        botones += `
            <button class="btn btn-sm btn-delete" 
                title="Eliminar Usuario"
                data-id="${row.id}">
                <i class="bi bi-trash3"></i>
            </button>
        `;
    }

    botones += `</div>`;
    return botones;
}

// Hacer globales las funciones para que Bootstrap Table las encuentre en el HTML
window.roleFormatter = roleFormatter;
window.dateFormatter = dateFormatter;
window.actionFormatter = actionFormatter;

// Variables globales para modales
let userModal, permissionsModal;

d.addEventListener('DOMContentLoaded', () => {
    const modalEl = d.getElementById('modalUsuario');
    if (modalEl) userModal = new bootstrap.Modal(modalEl);
    
    const modalPermisosEl = d.getElementById('modalPermisos');
    if (modalPermisosEl) permissionsModal = new bootstrap.Modal(modalPermisosEl);

    // --- EVENT LISTENERS (Para elementos estáticos) ---
    const btnNewUser = d.getElementById('btnNewUser');
    if (btnNewUser) btnNewUser.addEventListener('click', abrirModalCrear);

    const btnSaveUser = d.getElementById('btnSaveUser');
    if (btnSaveUser) btnSaveUser.addEventListener('click', guardarUsuario);

    // Delegación de eventos específica para la tabla (si no usa data-action en el row)
    const tablaUsuarios = d.getElementById('tablaUsuarios');
    if (tablaUsuarios) {
        tablaUsuarios.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('btn-edit')) {
                const { id, username, role, branchId } = target.dataset;
                abrirModalEditar(id, username, role, branchId);
            } else if (target.classList.contains('btn-permissions')) {
                const { id, username, modules } = target.dataset;
                abrirModalPermisos(id, username, modules);
            } else if (target.classList.contains('btn-delete')) {
                const { id } = target.dataset;
                eliminarUsuario(id);
            }
        });
    }

    const roleSelect = d.getElementById('role');
    if (roleSelect) roleSelect.addEventListener('change', toggleAdminNote);
});

// --- FUNCIONES GLOBALES ---

window.abrirModalCrear = function() {
    d.getElementById('modalTitle').innerText = 'Nuevo Usuario';
    d.getElementById('userId').value = '';
    d.getElementById('username').value = '';
    d.getElementById('password').value = '';
    d.getElementById('passHelp').innerText = 'Requerido para nuevos usuarios';
    if (userModal) userModal.show();
};

window.abrirModalEditar = function(id, username, role, branchId) {
    d.getElementById('modalTitle').innerText = 'Editar Usuario';
    d.getElementById('userId').value = id;
    d.getElementById('username').value = username;
    d.getElementById('password').value = '';
    d.getElementById('role').value = role;
    d.getElementById('branchId').value = branchId; 
    d.getElementById('passHelp').innerText = 'Dejar en blanco para mantener la actual';
    if (userModal) userModal.show();
};

window.abrirModalPermisos = function(id, username, modulesStr) {
    d.getElementById('permUserId').value = id;
    d.getElementById('permUserName').value = username;
    d.getElementById('permUserDisplay').innerText = username;

    d.querySelectorAll('.module-check').forEach(chk => chk.checked = false);

    if (modulesStr && modulesStr !== 'null' && modulesStr !== '') {
        const modulesArray = modulesStr.split(',');
        modulesArray.forEach(code => {
            const chk = d.querySelector(`.module-check[value="${code}"]`);
            if (chk) chk.checked = true;
        });
    }
    if (permissionsModal) permissionsModal.show();
};

window.guardarPermisos = async function() {
    const id = d.getElementById('permUserId').value;
    const username = d.getElementById('permUserName').value;
    const selectedModules = [];
    
    d.querySelectorAll('.module-check:checked').forEach(chk => {
        selectedModules.push(chk.value);
    });

    try {
        const response = await fetch(`/users/${id}/modules`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modules: selectedModules, username: username })
        });

        const result = await response.json();

        if (result.success) {
            showSuccessToast('Permisos actualizados');
            if (permissionsModal) permissionsModal.hide();
            $('#tablaUsuarios').bootstrapTable('refresh'); 
        } else {
            showErrorToast(result.error);
        }
    } catch (e) {
        showErrorToast('Error de conexión');
    }
};

window.toggleAdminNote = function() {
    const role = d.getElementById('role').value;
    const note = d.getElementById('adminNote');
    if (role === 'admin') {
        if(note) note.style.display = 'block';
    } else {
        if(note) note.style.display = 'none';
    }
};

window.guardarUsuario = async function() {
    const id = d.getElementById('userId').value;
    const username = d.getElementById('username').value;
    const password = d.getElementById('password').value;
    const role = d.getElementById('role').value;
    const branch_id = d.getElementById('branchId').value;

    if (!username) return Swal.fire('Error', 'El usuario es obligatorio', 'warning');
    if (!id && !password) return Swal.fire('Error', 'Contraseña obligatoria', 'warning');

    const url = id ? `/users/${id}` : '/users';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, branch_id })
        });

        const result = await response.json();
        if (result.success) {
            showSuccessToast('Usuario guardado');
            if (userModal) userModal.hide();
            $('#tablaUsuarios').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error);
        }
    } catch (error) {
        showErrorToast('Error de conexión con el servidor');
    }
};

window.eliminarUsuario = async function(id) {
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
        const response = await fetch(`/users/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showSuccessToast('El usuario ha sido eliminado');
            $('#tablaUsuarios').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error);
        }
    } catch (error) {
        showErrorToast('Error al intentar eliminar');
    }
};