import Usuario from '../models/Usuario.js';

class AuthController {
    constructor() {
        this.usuarioActual = null;
    }

    async login(usuario, password, rol) {
        try {
            const resultado = await Usuario.validarCredenciales(usuario, password, rol);
            
            if (resultado.success) {
                this.usuarioActual = resultado.usuario;
                // Guardar sesión en localStorage
                localStorage.setItem('usuarioSesion', JSON.stringify(resultado.usuario));
                return { success: true, usuario: resultado.usuario };
            }
            
            return { success: false, mensaje: 'Usuario o contraseña incorrectos' };
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, mensaje: 'Error al iniciar sesión' };
        }
    }

    logout() {
        this.usuarioActual = null;
        localStorage.removeItem('usuarioSesion');
        window.location.href = '../index.html'; // Cambiado de /index.html
    }

    obtenerSesion() {
        const sesion = localStorage.getItem('usuarioSesion');
        if (sesion) {
            this.usuarioActual = JSON.parse(sesion);
            return this.usuarioActual;
        }
        return null;
    }

    verificarSesion() {
        const sesion = this.obtenerSesion();
        if (!sesion) {
            window.location.href = '../index.html'; // Cambiado de /index.html
            return false;
        }
        return true;
    }

    verificarRol(rolRequerido) {
        const sesion = this.obtenerSesion();
        if (!sesion || sesion.rol !== rolRequerido) {
            window.location.href = '../index.html'; // Cambiado de /index.html
            return false;
        }
        return true;
    }
}

export default new AuthController();