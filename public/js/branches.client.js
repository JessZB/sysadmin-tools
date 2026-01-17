const d = document;

// ============================================
// BRANCHES CLIENT - GESTIÓN DE SUCURSALES
// ============================================

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
        return '<span class="badge status-success-custom"><i class="bi bi-check-circle"></i> Activa</span>';
    } else {
        return '<span class="badge status-idle"><i class="bi bi-x-circle"></i> Inactiva</span>';
    }
}

// Formatter para Acciones (Editar/Eliminar)
function actionFormatter(value, row) {
    return `
        <button class="btn btn-sm btn-outline-cerulean me-1 btn-edit" 
            data-id="${row.id}"
            data-name="${row.name}"
            data-code="${row.code}"
            data-address="${escapeHtml(row.address || '')}"
            data-active="${row.is_active}">
            <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-punch btn-delete" 
            data-id="${row.id}"
            data-name="${row.name}">
            <i class="bi bi-trash"></i>
        </button>
    `;
}

// Función auxiliar para escapar HTML en atributos
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

// Hacer globales las funciones para que Bootstrap Table las encuentre en el HTML
window.statusFormatter = statusFormatter;
window.actionFormatter = actionFormatter;

d.addEventListener('DOMContentLoaded', () => {
    const modalEl = d.getElementById('modalBranch');
    const modal = new bootstrap.Modal(modalEl);

    // --- EVENT LISTENERS ---

    // 1. Botón Nueva Sucursal
    const btnNewBranch = d.getElementById('btnNewBranch');
    if (btnNewBranch) {
        btnNewBranch.addEventListener('click', abrirModalCrear);
    }

    // 2. Botón Guardar Sucursal
    const btnSaveBranch = d.getElementById('btnSaveBranch');
    if (btnSaveBranch) {
        btnSaveBranch.addEventListener('click', guardarBranch);
    }

    // 3. Delegación de eventos para la tabla
    const tablaBranches = d.getElementById('tablaBranches');
    if (tablaBranches) {
        tablaBranches.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('btn-edit')) {
                const { id, name, code, address, active } = target.dataset;
                abrirModalEditar(id, name, code, address, active);
            } else if (target.classList.contains('btn-delete')) {
                const { id, name } = target.dataset;
                eliminarBranch(id, name);
            }
        });
    }

    // --- FUNCIONES ---

    function abrirModalCrear() {
        d.getElementById('modalTitle').innerText = 'Nueva Sucursal';
        d.getElementById('branchId').value = '';
        d.getElementById('name').value = '';
        d.getElementById('code').value = '';
        d.getElementById('address').value = '';
        d.getElementById('is_active').value = '1';
        modal.show();
    }

    function abrirModalEditar(id, name, code, address, is_active) {
        d.getElementById('modalTitle').innerText = 'Editar Sucursal';
        d.getElementById('branchId').value = id;
        d.getElementById('name').value = name;
        d.getElementById('code').value = code;
        d.getElementById('address').value = address;
        d.getElementById('is_active').value = is_active;
        modal.show();
    }

    async function guardarBranch() {
        const id = d.getElementById('branchId').value;
        const name = d.getElementById('name').value.trim();
        const code = d.getElementById('code').value.trim();
        const address = d.getElementById('address').value.trim();
        const is_active = d.getElementById('is_active').value;

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
});
