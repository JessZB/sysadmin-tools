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
    // row contiene el objeto usuario completo (id, username, role...)
    
    // Botón Editar
  let botones = `
        <button class="btn btn-sm btn-outline-cerulean me-1" 
            onclick="abrirModalEditar('${row.id}', '${row.username}', '${row.role}', '${row.branch_id}')">
            <i class="bi bi-pencil"></i>
        </button>
    `;
    // Botón Eliminar (Validación visual contra el usuario actual)
    // Usamos la variable global currentUserId definida en el EJS
    if (row.id !== currentUserId) {
        botones += `
            <button class="btn btn-sm btn-outline-punch" 
                onclick="eliminarUsuario('${row.id}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
    } else {
        botones += `
            <button class="btn btn-sm btn-frosted" disabled title="No puedes eliminarte a ti mismo">
                <i class="bi bi-trash"></i>
            </button>
        `;
    }

    return '<div class="text-end">' + botones + '</div>';
}

// Hacer globales las funciones para que Bootstrap Table las encuentre en el HTML
window.roleFormatter = roleFormatter;
window.dateFormatter = dateFormatter;
window.actionFormatter = actionFormatter;

const modalEl = document.getElementById('modalUsuario');
const modal = new bootstrap.Modal(modalEl);

// 1. Abrir Modal para CREAR
function abrirModalCrear() {
    document.getElementById('modalTitle').innerText = 'Nuevo Usuario';
    document.getElementById('userId').value = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // NUEVO: Resetear switches (Dashboard activo por defecto)
    document.querySelectorAll('.module-check').forEach(chk => chk.checked = false);
    document.getElementById('mod_dashboard').checked = true; // Default
    
    document.getElementById('role').value = 'analista';
    document.getElementById('branchId').value = "1"; // Default a Matriz o el primero
    toggleAdminNote()
    
    document.getElementById('passHelp').innerText = 'Requerido para nuevos usuarios';
    
    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modal.show();
}


// 2. Abrir Modal para EDITAR
// 2. ABRIR EDITAR (Recibe branchId)
function abrirModalEditar(id, username, role, branchId) {
    document.getElementById('modalTitle').innerText = 'Editar Usuario';
    document.getElementById('userId').value = id;
    document.getElementById('username').value = username;
    document.getElementById('password').value = ''; // Limpiar pass
    
    document.getElementById('role').value = role;
    document.getElementById('branchId').value = branchId; // Seleccionar sucursal actual
    
    document.getElementById('passHelp').innerText = 'Dejar en blanco para mantener la actual';

    // NUEVO: Marcar switches según los datos
    document.querySelectorAll('.module-check').forEach(chk => chk.checked = false);
    
    if (modulesStr && modulesStr !== 'null') {
        const modulesArray = modulesStr.split(',');
        modulesArray.forEach(code => {
            const chk = document.querySelector(`.module-check[value="${code}"]`);
            if (chk) chk.checked = true;
        });
    }

    toggleAdminNote();

    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modal.show();
}

// Agrega un listener al select de rol para mostrar nota informativa
document.getElementById('role').addEventListener('change', toggleAdminNote);

function toggleAdminNote() {
    const role = document.getElementById('role').value;
    const note = document.getElementById('adminNote');
    const inputs = document.querySelectorAll('.module-check');

    if (role === 'admin') {
        if(note) note.style.display = 'block';
        // Opcional: Bloquear checkboxes o marcarlos todos visualmente
        // inputs.forEach(i => i.checked = true); 
    } else {
        if(note) note.style.display = 'none';
    }
}

async function guardarUsuario() {
   const id = document.getElementById('userId').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const branch_id = document.getElementById('branchId').value; // <--- NUEVO

    if (!username) return Swal.fire('Error', 'El usuario es obligatorio', 'warning');
    if (!id && !password) return Swal.fire('Error', 'Contraseña obligatoria', 'warning');

    // NUEVO: Obtener módulos marcados
    const selectedModules = [];
    document.querySelectorAll('.module-check:checked').forEach(chk => {
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
                password: document.getElementById('password').value, 
                role: document.getElementById('role').value, 
                branch_id: document.getElementById('branchId').value,
                modules: selectedModules // <--- ENVIAMOS EL ARRAY
            })
        });

        const result = await response.json();

        // Cerramos el loading inmediatamente
        Swal.close(); 

       if (result.success) {
            showSuccessToast('Usuario guardado');
            bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
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

// 4. Eliminar con SweetAlert (Confirmación bonita)
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
            // USAMOS TOAST AQUÍ
            showSuccessToast('El usuario ha sido eliminado');
            
            // Refrescar tabla
            $('#tablaUsuarios').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error);
        }
    } catch (error) {
        Swal.close();
        showErrorToast('Error al intentar eliminar');
    }
}