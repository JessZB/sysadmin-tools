/**
 * Categories Management Dashboard Script
 * Follows "Nothing Style" - Functions are called via data-action in list.ejs
 */

async function saveCategory() {
    const btn = document.getElementById('btnSaveCategory');
    if (btn) btn.disabled = true;

    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('catName').value;
    const description = document.getElementById('catDesc').value;
    const icon = document.getElementById('catIcon').value;

    if (!name) {
        if (btn) btn.disabled = false;
        return Swal.fire('Error', 'El nombre es obligatorio', 'error');
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/categories/${id}` : '/categories';

    try {
        const r = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, icon })
        });
        const data = await r.json();
        if (data.success) {
            location.reload();
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
        if (btn) btn.disabled = false;
    }
}

/**
 * Loads category data into the modal for editing
 * @param {HTMLElement} el - The element triggering the action
 */
function editCategory(el) {
    document.getElementById('categoryId').value = el.dataset.id;
    document.getElementById('catName').value = el.dataset.name;
    document.getElementById('catDesc').value = el.dataset.desc || '';
    document.getElementById('catIcon').value = el.dataset.icon || 'bi-folder';
    
    const modalElement = document.getElementById('modalCategory');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Deletes a category with confirmation
 * @param {number|string} id - Category ID
 */
function deleteCategory(id) {
    Swal.fire({
        title: '¿Eliminar Categoría?',
        text: "Los módulos volverán a 'Sin Categoría'",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const r = await fetch(`/categories/${id}`, { method: 'DELETE' });
                const d = await r.json();
                if (d.success) location.reload();
                else throw new Error(d.error);
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    });
}

/**
 * Assigns a module to a category (triggered by select change)
 * @param {string} moduleCode 
 * @param {number|string} categoryId 
 */
async function assignModule(moduleCode, categoryId) {
    try {
        const r = await fetch(`/categories/assign-module`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleCode, categoryId })
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
        
        if (window.showSuccessToast) {
            window.showSuccessToast('Módulo reasignado correctamente');
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}

// ==========================================
// Listener para reasignación de módulos
// Usa 'change' directo (NO data-action) para evitar
// que el delegador global dispare en el click de apertura.
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('change', (e) => {
        const select = e.target.closest('.module-category-select');
        if (!select) return;
        const moduleCode = select.dataset.moduleCode;
        const categoryId = select.value;
        assignModule(moduleCode, categoryId);
    });
});
