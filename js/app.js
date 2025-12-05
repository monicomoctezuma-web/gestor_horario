import AuthController from './controllers/AuthController.js';

// Función principal de inicialización
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // Estamos en la página de login
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const rol = document.getElementById('rol').value;
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    
    // Limpiar mensaje de error
    errorMsg.classList.remove('show');
    errorMsg.textContent = '';
    
    // Validar campos
    if (!rol || !usuario || !password) {
        mostrarError('Por favor complete todos los campos');
        return;
    }
    
    // Mostrar indicador de carga
    const btnLogin = document.querySelector('.btn-login');
    const textoOriginal = btnLogin.textContent;
    btnLogin.textContent = 'Iniciando sesión...';
    btnLogin.disabled = true;
    
    try {
        const resultado = await AuthController.login(usuario, password, rol);
        
        if (resultado.success) {
            // Redirigir según el rol
            switch(rol) {
                case 'subdirector':
                    window.location.href = 'pages/subdirector.html';
                    break;
                case 'jefe':
                    window.location.href = 'pages/jefe.html';
                    break;
                case 'docente':
                    window.location.href = 'pages/docente.html';
                    break;
                default:
                    mostrarError('Rol no válido');
            }
        } else {
            mostrarError(resultado.mensaje || 'Error al iniciar sesión');
            btnLogin.textContent = textoOriginal;
            btnLogin.disabled = false;
        }
    } catch (error) {
        console.error('Error en login:', error);
        mostrarError('Error al conectar con el servidor');
        btnLogin.textContent = textoOriginal;
        btnLogin.disabled = false;
    }
}

function mostrarError(mensaje) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = mensaje;
    errorMsg.classList.add('show');
}