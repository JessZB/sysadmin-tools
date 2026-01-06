// ==========================================
// CONFIGURACIÓN GLOBAL DE TOASTS (SweetAlert2)
// ==========================================

// 1. Definimos el estilo base del Toast (solo si no existe)
if (typeof window.ToastMixin === 'undefined') {
    window.ToastMixin = Swal.mixin({
        toast: true,
        position: 'top-end', // Arriba a la derecha
        showConfirmButton: false,
        timer: 3000, // Dura 3 segundos
        timerProgressBar: true,
        didOpen: (toast) => {
            // Pausar el tiempo si el usuario pasa el mouse por encima
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

// 2. Creamos funciones globales para usarlas en cualquier vista

/**
 * Muestra un mensaje de éxito pequeño en la esquina
 * @param {string} message - El texto a mostrar
 */
if (typeof window.showSuccessToast === 'undefined') {
    window.showSuccessToast = (message) => {
        window.ToastMixin.fire({
            icon: 'success',
            title: message
        });
    };
}

/**
 * Muestra un mensaje de error pequeño en la esquina
 * @param {string} message - El texto a mostrar
 */
if (typeof window.showErrorToast === 'undefined') {
    window.showErrorToast = (message) => {
        window.ToastMixin.fire({
            icon: 'error',
            title: message
        });
    };
}

/**
 * Muestra un mensaje de advertencia/info
 * @param {string} message 
 */
if (typeof window.showInfoToast === 'undefined') {
    window.showInfoToast = (message) => {
        window.ToastMixin.fire({
            icon: 'info',
            title: message
        });
    };
}

/**
 * Muestra la fecha tal cual viene en el string (formato UTC visual).
 * Entrada: '2025-12-23T07:44:30.000Z' -> Salida: '07:44:30, 23/12/2025'
 * Se usa para Cajas/Terminales donde la hora ya viene lista.
 */
window.formatDateRaw = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    
    // Usamos métodos UTC para extraer los números exactos sin conversión
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}, ${day}/${month}/${year}`;
};

/**
 * Convierte la fecha UTC a la Hora Local del navegador.
 * Entrada: '2025-12-23T07:44:30.000Z' (y estás en Vzla) -> Salida: '03:44:30, 23/12/2025'
 * Se usa para el Servidor que envía hora UTC real.
 */
window.formatDateToLocal = (value) => {
    if (!value) return '-';
    const date = new Date(value);

    // Usamos métodos locales (el navegador aplica el offset automáticamente)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}, ${day}/${month}/${year}`;
};