// ============================================
// BRANCHES CLIENT - GESTIÓN DE SUCURSALES
// ============================================

const modal = new bootstrap.Modal(document.getElementById('modalBranch'));

// Configuración de iconos para Bootstrap Table
window.icons = {
    refresh: 'bi-arrow-clockwise',
    toggle: 'bi-list',
    columns: 'bi-layout-three-columns'
};

// ============================================
// FORMATTERS PARA LA TABLA
// ============================================

// Formatter para Estado (Activo/Inactivo)
function statusFormatter(value, row) {
    if (value === 1) {
        return '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Activa</span>';
    } else {
        return '<span class="badge bg-secondary"><i class="bi bi-x-circle"></i> Inactiva</span>';
    }
}

// Formatter para Acciones (Editar/Eliminar)
function actionFormatter(value, row) {
    return `
        <button class="btn btn-sm btn-outline-primary me-1" 
            onclick="abrirModalEditar('${row.id}', '${row.name}', '${row.code}', '${escapeHtml(row.address || '')}', '${row.is_active}')">
            <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" 
            onclick="eliminarBranch(${row.id}, '${row.name}')">
            <i class="bi bi-trash"></i>
        </button>
    `;
}

// Función auxiliar para escapar HTML en atributos
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

// ============================================
// MODAL: CREAR
// ============================================
function abrirModalCrear() {
    document.getElementById('modalTitle').innerText = 'Nueva Sucursal';
    document.getElementById('branchId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('code').value = '';
    document.getElementById('address').value = '';
    document.getElementById('is_active').value = '1';
    modal.show();
}

// ============================================
// MODAL: EDITAR
// ============================================
function abrirModalEditar(id, name, code, address, is_active) {
    document.getElementById('modalTitle').innerText = 'Editar Sucursal';
    document.getElementById('branchId').value = id;
    document.getElementById('name').value = name;
    document.getElementById('code').value = code;
    document.getElementById('address').value = address;
    document.getElementById('is_active').value = is_active;
    modal.show();
}

// ============================================
// GUARDAR (CREATE/UPDATE)
// ============================================
async function guardarBranch() {
    const id = document.getElementById('branchId').value;
    const name = document.getElementById('name').value.trim();
    const code = document.getElementById('code').value.trim();
    const address = document.getElementById('address').value.trim();
    const is_active = document.getElementById('is_active').value;

    // Validaciones
    if (!name) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');
    if (!code) return Swal.fire('Error', 'El código es obligatorio', 'warning');

    const url = id ? `/branches/${id}` : '/branches';
    const method = id ? 'PUT' : 'POST';

    try {
        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                code, 
                address: address || null,
                is_active: Number(is_active)
            })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            showSuccessToast('Sucursal guardada correctamente');
            modal.hide();
            $('#tablaBranches').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error || 'Error al guardar');
        }
    } catch (error) {
        Swal.close();
        showErrorToast('Error de comunicación con el servidor');
        console.error(error);
    }
}

// ============================================
// ELIMINAR
// ============================================
async function eliminarBranch(id, name) {
    const confirm = await Swal.fire({
        title: '¿Eliminar Sucursal?',
        html: `Estás a punto de eliminar: <strong>${name}</strong><br><br>
               <span class="text-danger">⚠️ Esta acción no se puede deshacer.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });

        const response = await fetch(`/branches/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        Swal.close();

        if (result.success) {
            showSuccessToast('Sucursal eliminada correctamente');
            $('#tablaBranches').bootstrapTable('refresh');
        } else {
            showErrorToast(result.error || 'Error al eliminar');
        }
    } catch (error) {
        Swal.close();
        showErrorToast('Error de comunicación con el servidor');
        console.error(error);
    }
}
