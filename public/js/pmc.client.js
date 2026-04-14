/**
 * PMC Planogram Client - Multi-Shelf Logic
 * Handles Drag-and-Drop between multiple horizontal shelves.
 */

(function() {
    // ─── STATE & CACHE ──────────────────────────────────────────
    
    // Store product details to look them up by product_id
    const productCache = new Map();
    
    // Populate cache with initial products
    if (window.INITIAL_PRODUCTS) {
        window.INITIAL_PRODUCTS.forEach(p => productCache.set(Number(p.id), p));
    }

    const layoutState = {
        isDragging: false,
        selectedInstanceId: null
    };

    // ─── INITIALIZATION ──────────────────────────────────────────
    
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('planogramCanvas')) {
            initPlanogramEditor();
        }
        
        // Existing global logic for searches
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    window.searchProductsAction();
                }, 500);
            });
        }
    });

    function initPlanogramEditor() {
        const catalogEl = document.getElementById('searchResultsContainer');
        const shelfContainers = document.querySelectorAll('.shelf-container');
        const trashEl = document.getElementById('trashZone');

        if (!window.Sortable) return;

        // 1. Catalog -> Shelf (Clone)
        new Sortable(catalogEl, {
            group: {
                name: 'planogram',
                pull: 'clone',
                put: false
            },
            sort: false,
            animation: 150,
            draggable: '.search-result-item'
        });

        // 2. Initialize Sortable on each shelf
        shelfContainers.forEach(container => {
            initShelfSortable(container);
        });

        // 3. Trash Zone
        new Sortable(trashEl, {
            group: 'planogram',
            animation: 150,
            onAdd: function (evt) {
                evt.item.remove();
                window.showInfoToast('Producto removido');
            }
        });
    }

    function initShelfSortable(el) {
        if (!el) return;
        new Sortable(el, {
            group: 'planogram',
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.hablador-card-wrapper',
            onAdd: function (evt) {
                // If from catalog
                if (evt.item.classList.contains('search-result-item')) {
                    const pData = JSON.parse(evt.item.getAttribute('data-product-json'));
                    const instanceId = `inst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    
                    // Add to cache if not already there
                    productCache.set(Number(pData.id), pData);
                    
                    evt.item.innerHTML = renderHabladorHTML(pData, instanceId);
                    evt.item.className = 'hablador-card-wrapper';
                    evt.item.setAttribute('data-id', instanceId);
                    evt.item.setAttribute('data-product-id', pData.id);
                }
                window.showInfoToast('Movido al estante #' + el.getAttribute('data-shelf'));
                el.classList.remove('is-empty');
            },
            onRemove: function(evt) {
                if (el.children.length === 0) {
                    el.classList.add('is-empty');
                }
            }
        });
    }

    // ─── UI RENDERING ──────────────────────────────────────────────

    function renderHabladorHTML(p, instId) {
        const price = Number(p.price1 || p.current_price || 0).toFixed(2);
        const hasUpdate = p.has_price_update ? '<div class="hablador-badge-update">ACT.</div>' : '';
        const img = p.image_path
            ? `<img src="${p.image_path}" alt="">`
            : '<i class="bi bi-box-seam" style="font-size:2rem; color:#cbd5e1;"></i>';

        return `
            <div class="hablador-card" data-action="selectProductInstance('${instId}')">
                ${hasUpdate}
                <div class="hablador-img-container">${img}</div>
                <div class="hablador-body">
                    <div class="hablador-title" title="${p.description}">${p.description}</div>
                    <div class="hablador-code">${p.product_code}</div>
                    <div class="hablador-price-container">
                        <span class="hablador-price">$${price}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── ACTIONS ───────────────────────────────────────────────────

    window.addNewShelf = function() {
        const container = document.getElementById('aisleShelvesContainer');
        const shelfIds = Array.from(document.querySelectorAll('.shelf-container'))
                             .map(el => parseInt(el.getAttribute('data-shelf')));
        const nextId = shelfIds.length ? Math.max(...shelfIds) + 1 : 1;

        const div = document.createElement('div');
        div.className = 'shelf-wrapper';
        div.id = `shelf-wrapper-${nextId}`;
        div.innerHTML = `
            <div class="shelf-label">
                <span>ESTANTE #${nextId}</span>
                <button data-action="removeShelf(${nextId})">✕ QUITAR</button>
            </div>
            <div class="shelf-container is-empty" data-shelf="${nextId}"></div>
            <div class="shelf-base">
                <div class="shelf-price-strip"></div>
            </div>
        `;
        container.appendChild(div);
        initShelfSortable(div.querySelector('.shelf-container'));
        window.showInfoToast('Nuevo estante añadido');
    };

    window.removeShelf = function(id) {
        const el = document.querySelector(`.shelf-container[data-shelf="${id}"]`);
        if (!el) return;
        
        if (el.children.length > 0) {
            return window.showErrorToast('El estante debe estar vacío para quitarlo');
        }
        
        el.closest('.shelf-wrapper').remove();
    };

    window.savePlanogramLayout = async function() {
        const saveBtn = document.querySelector('[data-action="savePlanogramLayout()"]');
        const status = document.getElementById('saveStatus');
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> GUARDANDO...';

        const allProducts = [];
        document.querySelectorAll('.shelf-container').forEach(shelfEl => {
            const shelfNum = parseInt(shelfEl.getAttribute('data-shelf'));
            shelfEl.querySelectorAll('.hablador-card-wrapper').forEach((pEl, idx) => {
                allProducts.push({
                    product_id: parseInt(pEl.getAttribute('data-product-id')),
                    shelf_number: shelfNum,
                    display_order: idx
                });
            });
        });

        try {
            const payload = {
                aisle_id: window.CURRENT_AISLE_ID,
                products: allProducts
            };

            const res = await fetch(`/pmc/api/aisles/${window.CURRENT_AISLE_ID}/layout`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if ((await res.json()).success) {
                status.classList.remove('opacity-0');
                setTimeout(() => status.classList.add('opacity-0'), 3000);
            } else {
                window.showErrorToast('Error al guardar diseño');
            }
        } catch (e) {
            window.showErrorToast('Error de conexión');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-save me-2"></i> GUARDAR DISEÑO';
        }
    };

    window.searchProductsAction = async function() {
        const search = document.getElementById('productSearchInput').value;
        const terminalId = document.getElementById('selectTerminal').value;
        const container = document.getElementById('searchResultsContainer');

        if (!search || search.length < 3) return;

        container.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-danger" role="status"></span></div>';

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const branchQuery = urlParams.has('branch_id') ? `&branch_id=${urlParams.get('branch_id')}` : '';
            const res = await fetch(`/pmc/api/products/search?terminal_id=${terminalId}&search=${encodeURIComponent(search)}${branchQuery}`);
            const data = await res.json();

            if (data.products && data.products.length > 0) {
                container.innerHTML = data.products.map(p => `
                    <div class="search-result-item glass-panel p-2 mb-2 d-flex flex-column" 
                         data-product-json='${JSON.stringify(p).replace(/'/g, "&apos;")}'>
                        <h6 class="text-white font-tech mb-1" style="font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.description}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-danger fw-bold" style="font-size: 0.6rem;">$${Number(p.price1).toFixed(2)}</small>
                            <small class="text-white-50" style="font-size: 0.5rem;">${p.product_code}</small>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-center font-tech text-white-50 small mt-3">SIN RESULTADOS</p>';
            }
        } catch (e) {
            container.innerHTML = '<p class="text-danger font-tech small text-center mt-3">ERROR</p>';
        }
    };

    window.selectProductInstance = function(instId) {
        // Find the element first to get its product_id
        const wrapper = document.querySelector(`.hablador-card-wrapper[data-id="${instId}"]`);
        if (!wrapper) return;
        
        const productId = Number(wrapper.getAttribute('data-product-id'));
        const product = productCache.get(productId);
        if (!product) return;

        const panel = document.getElementById('contextPanel');
        const content = document.getElementById('contextContent');
        
        panel.classList.remove('hidden');
        content.innerHTML = `
            <div class="text-center mb-4">
                <div class="hablador-img-container mb-3" style="height: 150px; background: white; border: 1px solid #000;">
                    ${product.image_path ? `<img src="${product.image_path}" style="width:100%; height:100%; object-fit:contain;">` : '<i class="bi bi-image fs-1 opacity-25"></i>'}
                </div>
                <h5 class="font-tech text-white mb-1 small">${product.description}</h5>
                <div class="font-tech text-danger">$${Number(product.price1 || product.current_price).toFixed(2)}</div>
            </div>
            <div class="border-top border-white border-opacity-10 pt-3">
                <div class="mb-3">
                    <label class="font-tech text-white-50 small mb-1">CÓDIGO:</label>
                    <div class="text-white small">${product.product_code}</div>
                </div>
                <div class="mb-3">
                    <label class="font-tech text-white-50 small mb-1">MARCA:</label>
                    <div class="text-white small">${product.brand || 'N/A'}</div>
                </div>
                <button class="btn btn-nothing-secondary w-100 btn-sm mb-2" data-action="triggerImageUpload(${product.id})">
                    <i class="bi bi-camera me-1"></i> CAMBIAR IMAGEN
                </button>
                <button class="btn btn-outline-danger w-100 btn-sm" data-action="removeFromAisleStateUI('${instId}')">
                    <i class="bi bi-trash me-1"></i> QUITAR DEL PASILLO
                </button>
            </div>
        `;
    };

    window.removeFromAisleStateUI = function(instId) {
        const el = document.querySelector(`.hablador-card-wrapper[data-id="${instId}"]`);
        if (el) {
            const shelf = el.closest('.shelf-container');
            el.remove();
            if (shelf && shelf.children.length === 0) {
                shelf.classList.add('is-empty');
            }
        }
        window.closeContextPanel();
        window.showInfoToast('Producto removido visualmente');
    };

    window.closeContextPanel = function() {
        document.getElementById('contextPanel').classList.add('hidden');
    };

    // ─── IMAGE UPLOAD ───────────────────────────────────────────────
    
    let activeProductIdForImage = null;
    window.triggerImageUpload = function(productId) {
        activeProductIdForImage = productId;
        document.getElementById('imageInput').click();
    };

    window.handleImageUploadChange = async function(event) {
        const file = event.target.files[0];
        if (!file || !activeProductIdForImage) return;
        const formData = new FormData();
        formData.append('image', file);
        window.showInfoToast('SUBIENDO...');
        try {
            const res = await fetch(`/pmc/api/products/${activeProductIdForImage}/image`, { method: 'PUT', body: formData });
            if ((await res.json()).success) {
                window.showSuccessToast('Imagen actualizada');
                location.reload();
            }
        } catch (e) { window.showErrorToast('Error'); }
    };

    window.deleteAisleDetail = async function(id) {
        const res = await Swal.fire({
            title: '¿ELIMINAR PASILLO?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d90429',
            background: '#2b2d42', color: '#edf2f4'
        });
        if (res.isConfirmed) {
            const delRes = await fetch(`/pmc/api/aisles/${id}`, { method: 'DELETE' });
            if ((await delRes.json()).success) location.href = '/pmc';
        }
    };

    // ─── DASHBOARD ACTIONS ─────────────────────────────────────────

    window.openImportModal = function() {
        location.href = '/pmc/import';
    };

    window.openCreateAisleModal = function(id = null) {
        const modalEl = document.getElementById('modalAisle');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        const form = document.getElementById('formAisle');
        
        form.reset();
        document.getElementById('aisleId').value = id || '';
        document.getElementById('modalAisleTitle').innerText = id ? 'EDITAR PASILLO' : 'NUEVO PASILLO';

        if (id) {
            // El ID viene del botón de editar si existiera, pero aquí lo implementamos para ser robustos
            // Por ahora el dashboard solo crea.
        }

        modal.show();
    };

    window.saveAisle = async function() {
        const id = document.getElementById('aisleId').value;
        const branchSelect = document.getElementById('dashboardBranchSelect');
        const payload = {
            number: document.getElementById('aisleNumber').value,
            name: document.getElementById('aisleName').value,
            color: document.getElementById('aisleColor').value,
            branch_id: branchSelect ? branchSelect.value : null
        };

        if (!payload.number || !payload.name) {
            return window.showErrorToast('Completa todos los campos');
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/pmc/api/aisles/${id}` : '/pmc/api/aisles';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                window.showSuccessToast('Pasillo guardado');
                bootstrap.Modal.getInstance(document.getElementById('modalAisle')).hide();
                location.reload();
            } else {
                window.showErrorToast(result.error || 'Error al guardar');
            }
        } catch (e) {
            window.showErrorToast('Error de conexión');
        }
    };

    window.deleteAisle = async function() {
        const id = this.getAttribute('data-id');
        const res = await Swal.fire({
            title: '¿ELIMINAR PASILLO?',
            text: 'Se perderá la organización de productos de este pasillo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d90429',
            cancelButtonColor: '#8d99ae',
            confirmButtonText: 'SÍ, ELIMINAR',
            background: '#2b2d42',
            color: '#edf2f4'
        });

        if (res.isConfirmed) {
            try {
                const delRes = await fetch(`/pmc/api/aisles/${id}`, { method: 'DELETE' });
                if ((await delRes.json()).success) {
                    window.showSuccessToast('Pasillo eliminado');
                    location.reload();
                }
            } catch (e) {
                window.showErrorToast('Error al eliminar');
            }
        }
    };

    // ─── EXCEL IMPORT ──────────────────────────────────────────────
    
    let currentExcelHeaders = [];

    window.handleExcelPreview = async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        window.showInfoToast('ANALIZANDO ARCHIVO...');

        try {
            const res = await fetch('/pmc/api/excel/preview', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                currentExcelHeaders = data.headers;
                renderExcelPreview(data.headers, data.preview);
                populateMappingOptions(data.headers);
                
                document.getElementById('uploadPhase').classList.add('d-none');
                document.getElementById('processingPhase').classList.remove('d-none');
            } else {
                window.showErrorToast(data.error || 'Error al leer Excel');
            }
        } catch (e) {
            window.showErrorToast('Error de conexión');
        }
    };

    function renderExcelPreview(headers, rows) {
        const head = document.getElementById('previewHeaders');
        const body = document.getElementById('previewRows');
        
        head.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        body.innerHTML = rows.map(row => `
            <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
        `).join('');
    }

    function populateMappingOptions(headers) {
        const selects = document.querySelectorAll('#mappingForm select');
        
        // Cargar mapeo desde el DOM si no está inicializado
        if (!window.SAVED_MAPPING) {
            const dataEl = document.getElementById('savedMappingData');
            if (dataEl) {
                try {
                    window.SAVED_MAPPING = JSON.parse(dataEl.getAttribute('data-mapping') || '{}');
                } catch (e) { window.SAVED_MAPPING = {}; }
            }
        }

        selects.forEach(select => {
            const target = select.getAttribute('data-target');
            let html = '<option value="">Selecciona...</option>';
            headers.forEach(h => {
                // Autodetect based on name or previous mapping (logic can be added here)
                html += `<option value="${h}">${h}</option>`;
            });
            select.innerHTML = html;
        });

        // Intentar autoseleccionar si existe mapeo guardado (si estuviera en window.SAVED_MAPPING)
        if (window.SAVED_MAPPING) {
            Object.entries(window.SAVED_MAPPING).forEach(([target, source]) => {
                const select = document.querySelector(`select[data-target="${target}"]`);
                if (select) select.value = source;
            });
        }
    }

    window.processExcelAction = async function() {
        const fileInput = document.getElementById('excelFile');
        const file = fileInput.files[0];
        if (!file) return window.showErrorToast('Selecciona un archivo');

        const mapping = {};
        let missingReq = false;
        document.querySelectorAll('#mappingForm select').forEach(select => {
            const target = select.getAttribute('data-target');
            if (select.value) {
                mapping[target] = select.value;
            } else if (target === 'code' || target === 'newPrice') {
                missingReq = true;
            }
        });

        if (missingReq) {
            return window.showErrorToast('Código y Precio Nuevo son obligatorios');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(mapping));

        window.showInfoToast('PROCESANDO ACTUALIZACIONES...');

        try {
            const res = await fetch('/pmc/api/excel/process', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                await Swal.fire({
                    title: '¡IMPORTACIÓN EXITOSA!',
                    html: `
                        <div class="text-start font-body small">
                            <p>✅ <strong>${data.updated}</strong> productos actualizados.</p>
                            <p>🔍 <strong>${data.matched}</strong> coincidencias encontradas.</p>
                            <p>❌ <strong>${data.notFound}</strong> códigos no encontrados en el sistema.</p>
                        </div>
                    `,
                    icon: 'success',
                    background: '#2b2d42', color: '#edf2f4', confirmButtonColor: '#ef233c'
                });
                location.href = '/pmc';
            } else {
                window.showErrorToast(data.error || 'Error al procesar');
            }
        } catch (e) {
            window.showErrorToast('Error de servidor');
        }
    };

    // Color picker sync
    const colorInput = document.getElementById('aisleColor');
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            document.getElementById('colorHexDisplay').innerText = e.target.value.toUpperCase();
        });
    }

})();
