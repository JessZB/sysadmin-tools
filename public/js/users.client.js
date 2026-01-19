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
        <div class="d-flex justify-content-end gap-1">
            <button class="btn btn-sm btn-outline-cerulean btn-edit" 
                title="Editar Datos"
                data-id="${row.id}"
                data-username="${row.username}"
                data-role="${row.role}"
                data-branch-id="${row.branch_id}">
                <i class="bi bi-pencil"></i>
            </button>

            <button class="btn btn-sm btn-outline-dark btn-permissions" 
                title="Gestionar Permisos"
                data-id="${row.id}"
                data-username="${row.username}"
                data-modules="${modulesSafe}">
                <i class="fa-solid fa-user-lock"></i>
            </button>
    `;

    // Botón Eliminar
    if (!isCurrentUser) {
        botones += `
            <button class="btn btn-sm btn-outline-punch btn-delete" 
                title="Eliminar Usuario"
                data-id="${row.id}">
                <i class="bi bi-trash"></i>
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

d.addEventListener('DOMContentLoaded', () => {
    const modalEl = d.getElementById('modalUsuario');
    const modal = new bootstrap.Modal(modalEl);
    const modalPermisosEl = d.getElementById('modalPermisos');
    const modalPermisos = new bootstrap.Modal(modalPermisosEl);

    // --- EVENT LISTENERS ---

    // 1. Botón Nuevo Usuario
    const btnNewUser = d.getElementById('btnNewUser');
    if (btnNewUser) {
        btnNewUser.addEventListener('click', abrirModalCrear);
    }

    // 2. Botón Guardar Usuario
    const btnSaveUser = d.getElementById('btnSaveUser');
    if (btnSaveUser) {
        btnSaveUser.addEventListener('click', guardarUsuario);
    }

    // 3. Botón Guardar Permisos
    const btnSavePermissions = d.getElementById('btnSavePermissions');
    if (btnSavePermissions) {
        btnSavePermissions.addEventListener('click', guardarPermisos);
    }

    // 4. Delegación de eventos para la tabla
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

    // 5. Listener para cambio de rol
    const roleSelect = d.getElementById('role');
    if (roleSelect) {
        roleSelect.addEventListener('change', toggleAdminNote);
    }

    // --- FUNCIONES ---

    function abrirModalCrear() {
        d.getElementById('modalTitle').innerText = 'Nuevo Usuario';
        d.getElementById('userId').value = '';
        d.getElementById('username').value = '';
        d.getElementById('password').value = '';

        d.getElementById('passHelp').innerText = 'Requerido para nuevos usuarios';
        
        modal.show();
    }

    function abrirModalEditar(id, username, role, branchId) {
        d.getElementById('modalTitle').innerText = 'Editar Usuario';
        d.getElementById('userId').value = id;
        d.getElementById('username').value = username;
        d.getElementById('password').value = ''; // Limpiar pass
        
        d.getElementById('role').value = role;
        d.getElementById('branchId').value = branchId; 
        
        d.getElementById('passHelp').innerText = 'Dejar en blanco para mantener la actual';

        modal.show();
    }

    function abrirModalPermisos(id, username, modulesStr) {
        d.getElementById('permUserId').value = id;
        d.getElementById('permUserName').value = username;
        d.getElementById('permUserDisplay').innerText = username;

        // 1. Resetear todos los switches
        d.querySelectorAll('.module-check').forEach(chk => chk.checked = false);

        // 2. Marcar los que tiene asignados
        if (modulesStr && modulesStr !== 'null' && modulesStr !== '') {
            const modulesArray = modulesStr.split(',');
            modulesArray.forEach(code => {
                const chk = d.querySelector(`.module-check[value="${code}"]`);
                if (chk) chk.checked = true;
            });
        }

        modalPermisos.show();
    }

    async function guardarPermisos() {
        const id = d.getElementById('permUserId').value;
        const username = d.getElementById('permUserName').value;
        
        // Obtener seleccionados
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
                modalPermisos.hide();
                $('#tablaUsuarios').bootstrapTable('refresh'); 
            } else {
                showErrorToast(result.error);
            }
        } catch (e) {
            showErrorToast('Error de conexión');
        }
    }

    function toggleAdminNote() {
        const role = d.getElementById('role').value;
        const note = d.getElementById('adminNote');

        if (role === 'admin') {
            if(note) note.style.display = 'block';
        } else {
            if(note) note.style.display = 'none';
        }
    }

    async function guardarUsuario() {
        const id = d.getElementById('userId').value;
        const username = d.getElementById('username').value;
        const password = d.getElementById('password').value;
        const role = d.getElementById('role').value;
        const branch_id = d.getElementById('branchId').value;

        if (!username) return Swal.fire('Error', 'El usuario es obligatorio', 'warning');
        if (!id && !password) return Swal.fire('Error', 'Contraseña obligatoria', 'warning');

        const selectedModules = [];
        d.querySelectorAll('.module-check:checked').forEach(chk => {
            selectedModules.push(chk.value);
        });

        const url = id ? `/users/${id}` : '/users';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    role, 
                    branch_id,
                    modules: selectedModules 
                })
            });

            const result = await response.json();

            Swal.close(); 

            if (result.success) {
                showSuccessToast('Usuario guardado');
                modal.hide();
                $('#tablaUsuarios').bootstrapTable('refresh');
            } else {
                showErrorToast(result.error);
            }
        } catch (error) {
            Swal.close();
            console.error(error);
            showErrorToast('Error de conexión con el servidor');
        }
    }

    async function eliminarUsuario(id) {
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
            Swal.close();
            showErrorToast('Error al intentar eliminar');
        }
    }
});