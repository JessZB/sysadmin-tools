const d = document;

d.addEventListener('DOMContentLoaded', () => {
    const loginForm = d.getElementById('loginForm');
    const errorAlert = d.getElementById('loginError');
    const btnLogin = d.getElementById('btnLogin');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. UI: Bloquear botón y limpiar errores
            const username = d.getElementById('username').value;
            const password = d.getElementById('password').value;
            
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';
            errorAlert.classList.add('d-none');

            try {
                // 2. Petición al Backend
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                // 3. Leer la respuesta JSON (siempre será JSON ahora)
                const data = await response.json();

                if (response.ok && data.success) {
                    // ÉXITO: Redirigir a donde diga el backend
                    window.location.href = data.redirectUrl || '/dashboard';
                } else {
                    // ERROR: Mostrar mensaje del backend
                    throw new Error(data.error || 'Error al iniciar sesión');
                }

            } catch (error) {
                // 4. Manejo de Errores Visual
                errorAlert.innerText = error.message;
                errorAlert.classList.remove('d-none');
                
                // Resetear botón
                btnLogin.disabled = false;
                btnLogin.innerText = 'Entrar';
            }
        });
    }
});