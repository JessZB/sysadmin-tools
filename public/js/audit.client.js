// ============================================
// AUDIT CLIENT - GESTIÓN DE AUDITORÍA
// ============================================

const d = document;

// Configuración de iconos para Bootstrap Table
window.icons = {
    refresh: 'bi-arrow-clockwise',
    toggle: 'bi-list',
    columns: 'bi-layout-three-columns'
};

// ============================================
// FORMATTERS PARA LA TABLA
// ============================================

// Formatter para Fecha/Hora
function dateFormatter(value, row) {
    if (!value) return '-';
    const d = new Date(value);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="text-nowrap small">${dateStr}<br><span class="text-muted">${timeStr}</span></div>`;
}

// Formatter para Usuario
function userFormatter(value, row) {
    const role = row.role || 'N/A';
    return `
        <div class="d-flex flex-column">
            <span class="fw-bold text-dark">${value}</span>
            <small class="text-muted" style="font-size: 0.75rem;">${role}</small>
        </div>
    `;
}

// Formatter para Acción
function actionFormatter(value, row) {
    const icon = getActionIcon(value);
    return `<span class="badge bg-light text-dark border"><i class="fa-solid ${icon} me-1"></i>${value}</span>`;
}

// Formatter para Entidad
function entityFormatter(value, row) {
    return `<span class="font-monospace small">${value}</span>`;
}

// Formatter para Detalle
function detailsFormatter(value, row) {
    return `<small>${value}</small>`;
}

// Formatter para Sucursal/IP
function branchFormatter(value, row) {
    const ipAddress = row.ip_address || row['ip-address'] || '';
    const branchHtml = value 
        ? `<span class="text-primary"><i class="fa-solid fa-building"></i> ${value}</span>`
        : `<span class="text-muted"><i class="fa-solid fa-globe"></i> Global</span>`;
    
    return `
        <div class="d-flex flex-column small">
            ${branchHtml}
            <span class="text-muted text-truncate" style="max-width: 100px;" title="${ipAddress}">${ipAddress}</span>
        </div>
    `;
}

// ============================================
// HELPER: ICONOS POR ACCIÓN
// ============================================
function getActionIcon(action) {
    const icons = {
        'CREATE': 'fa-plus-circle text-success',
        'UPDATE': 'fa-pencil text-warning',
        'DELETE': 'fa-trash text-danger',
        'LOGIN': 'fa-right-to-bracket text-info',
        'EXECUTE': 'fa-play text-primary',
        'STOP': 'fa-stop text-danger'
    };
    return icons[action] || 'fa-info-circle text-secondary';
}

// ============================================
// INICIALIZACIÓN
// ============================================
d.addEventListener('DOMContentLoaded', function () {
    // Inicializar tabs de Bootstrap
    const triggerTabList = [].slice.call(d.querySelectorAll('#auditTabs button'));
    triggerTabList.forEach(function (triggerEl) {
        const tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener('click', function (event) {
            event.preventDefault();
            tabTrigger.show();
        });
    });

    // Procesar los datos de la tabla para incluir todos los campos necesarios
    const table = $('#tablaAuditoria');
    const rows = table.find('tbody tr');
    const processedData = [];

    rows.each(function() {
        const $row = $(this);
        processedData.push({
            created_at: $row.data('created-at') || $row.find('td').eq(0).text(),
            username: $row.data('username') || $row.find('td').eq(1).text(),
            role: $row.data('role') || '',
            action: $row.data('action') || $row.find('td').eq(2).text(),
            entity: $row.data('entity') || $row.find('td').eq(3).text(),
            details: $row.data('details') || $row.find('td').eq(4).text(),
            branch_name: $row.data('branch-name') || $row.find('td').eq(5).text(),
            ip_address: $row.data('ip-address') || ''
        });
    });

    // Destruir tabla si ya existe
    if ($.fn.bootstrapTable) {
        table.bootstrapTable('destroy');
    }

    // Inicializar Bootstrap Table con los datos procesados
    table.bootstrapTable({
        data: processedData,
        pagination: true,
        pageSize: 25,
        pageList: [10, 25, 50, 100],
        search: true,
        searchHighlight: true,
        showRefresh: true,
        showColumns: true,
        showToggle: false,
        sortable: true,
        sortName: 'created_at',
        sortOrder: 'desc',
        iconsPrefix: 'bi',
        icons: {
            refresh: 'bi-arrow-clockwise',
            columns: 'bi-layout-three-columns'
        },
        columns: [
            {
                field: 'created_at',
                title: 'Fecha / Hora',
                sortable: true,
                formatter: dateFormatter
            },
            {
                field: 'username',
                title: 'Usuario',
                sortable: true,
                formatter: userFormatter
            },
            {
                field: 'action',
                title: 'Acción',
                sortable: true,
                formatter: actionFormatter
            },
            {
                field: 'entity',
                title: 'Entidad',
                sortable: true,
                formatter: entityFormatter
            },
            {
                field: 'details',
                title: 'Detalle',
                sortable: false,
                formatter: detailsFormatter
            },
            {
                field: 'branch_name',
                title: 'Sucursal / IP',
                sortable: true,
                formatter: branchFormatter
            }
        ]
    });
});

// Hacer globales las funciones para que Bootstrap Table las encuentre
window.dateFormatter = dateFormatter;
window.userFormatter = userFormatter;
window.actionFormatter = actionFormatter;
window.entityFormatter = entityFormatter;
window.detailsFormatter = detailsFormatter;
window.branchFormatter = branchFormatter;
window.getActionIcon = getActionIcon;
