// === ACTUALIZACIÓN COMPLETA DE DocenteController.js ===
// Reemplaza el método generarMatrizHorario y agrega el nuevo método

import Docente from '../models/Docente.js';
import Materia from '../models/Materia.js';
import Horario from '../models/Horario.js';
import Grupo from '../models/Grupo.js'; // NUEVO: Importar modelo Grupo
import AuthController from './AuthController.js';

class DocenteController {
    constructor() {
        this.docenteActual = null;
        this.materiasDisponibles = [];
        this.materiasAsignadas = [];
        this.horario = [];
        this.grupos = []; // NUEVO: Array para almacenar grupos
    }

    async inicializar() {
        const usuario = AuthController.obtenerSesion();
        if (!usuario) {
            console.log('❌ No hay usuario en sesión');
            return false;
        }

        console.log('🔍 Buscando docente para usuario:', usuario);

        // CORRECCIÓN: Usar el docenteId directamente del usuario
        if (usuario.docenteId) {
            console.log('🔍 Buscando docente con ID:', usuario.docenteId);
            this.docenteActual = await Docente.obtenerPorId(usuario.docenteId);
            
            if (this.docenteActual) {
                console.log('✅ Docente encontrado:', this.docenteActual);
            } else {
                console.log('❌ No se encontró docente con ID:', usuario.docenteId);
                return false;
            }
        } else {
            console.log('❌ Usuario no tiene docenteId asignado');
            return false;
        }
        
        if (this.docenteActual) {
            await this.cargarMateriasDisponibles();
            await this.cargarMateriasAsignadas();
            await this.cargarHorario();
            await this.cargarGrupos(); // NUEVO: Cargar grupos del docente
            return true;
        }
        
        return false;
    }

    async cargarMateriasDisponibles() {
        this.materiasDisponibles = await Materia.obtenerTodas();
        console.log('📚 Materias disponibles cargadas:', this.materiasDisponibles.length);
        return this.materiasDisponibles;
    }

    async cargarMateriasAsignadas() {
        if (!this.docenteActual) return [];

        const todasMaterias = await Materia.obtenerTodas();
        const materiasIds = this.docenteActual.materias || [];
        
        this.materiasAsignadas = todasMaterias.filter(m => 
            materiasIds.includes(m.id)
        );
        
        console.log('📖 Materias asignadas al docente:', this.materiasAsignadas.length);
        return this.materiasAsignadas;
    }

    async actualizarMaterias(materiasIds) {
        if (!this.docenteActual) {
            return { success: false, mensaje: 'Docente no encontrado' };
        }

        console.log('💾 Actualizando materias del docente:', materiasIds);

        const resultado = await Docente.actualizar(this.docenteActual.id, {
            materias: materiasIds
        });

        if (resultado.success) {
            console.log('✅ Materias actualizadas correctamente');
            // Recargar datos
            await this.inicializar();
        } else {
            console.error('❌ Error al actualizar materias:', resultado);
        }

        return resultado;
    }

    async actualizarHorarioDisponible(horarioDisponible) {
        if (!this.docenteActual) {
            return { success: false, mensaje: 'Docente no encontrado' };
        }

        console.log('💾 Actualizando horario disponible del docente:', horarioDisponible);

        const resultado = await Docente.actualizar(this.docenteActual.id, {
            horarioDisponible: horarioDisponible
        });

        if (resultado.success) {
            console.log('✅ Horario disponible actualizado correctamente');
            // Recargar datos
            await this.inicializar();
        } else {
            console.error('❌ Error al actualizar horario disponible:', resultado);
        }

        return resultado;
    }

    async darAltaMateria(materiaId) {
        if (!this.docenteActual) {
            return { success: false, mensaje: 'Docente no encontrado' };
        }

        const resultado = await Docente.asignarMateria(this.docenteActual.id, materiaId);
        
        if (resultado.success) {
            await this.inicializar();
        }
        
        return resultado;
    }

    async eliminarMateria(materiaId) {
        if (!this.docenteActual) {
            return { success: false, mensaje: 'Docente no encontrado' };
        }

        const resultado = await Docente.removerMateria(this.docenteActual.id, materiaId);
        
        if (resultado.success) {
            await this.inicializar();
        }
        
        return resultado;
    }

    async cargarHorario() {
        if (!this.docenteActual) return [];

        this.horario = await Horario.obtenerPorDocente(this.docenteActual.id);
        console.log('📅 Horario del docente cargado:', this.horario.length, 'horas');
        return this.horario;
    }

    // NUEVO: Cargar grupos del docente
    async cargarGrupos() {
        if (!this.docenteActual) return [];

        this.grupos = await Grupo.obtenerPorDocente(this.docenteActual.id);
        console.log('👥 Grupos del docente cargados:', this.grupos.length);
        return this.grupos;
    }

    // ACTUALIZADO: Método que ahora incluye información de grupos
    generarMatrizHorario() {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];

        const matriz = {};
        
        horas.forEach(hora => {
            matriz[hora] = {};
            dias.forEach(dia => {
                const horarioItem = this.horario.find(h => 
                    h.dia === dia && h.hora === hora
                );
                
                if (horarioItem) {
                    const materia = this.materiasAsignadas.find(m => 
                        m.id === horarioItem.materiaId
                    );
                    
                    // NUEVO: Buscar el grupo correspondiente a esta materia
                    const grupo = this.grupos.find(g => 
                        g.materiaId === horarioItem.materiaId && 
                        g.semestre === horarioItem.semestre
                    );
                    
                    matriz[hora][dia] = {
                        id: horarioItem.id,
                        materia: materia?.nombre || 'Sin materia',
                        semestre: horarioItem.semestre,
                        aula: horarioItem.aula || 'Sin aula',
                        // NUEVO: Agregar información del grupo
                        grupo: grupo ? grupo.nombre : null,
                        cantidadAlumnos: grupo ? grupo.cantidadAlumnos : null
                    };
                } else {
                    matriz[hora][dia] = null;
                }
            });
        });

        return matriz;
    }

    obtenerEstadisticas() {
        const horasOcupadas = this.horario.length;
        const horasDisponibles = this.docenteActual?.horasSemanales || 0;
        const horasLibres = horasDisponibles - horasOcupadas;
        const porcentajeOcupacion = horasDisponibles > 0 
            ? (horasOcupadas / horasDisponibles * 100).toFixed(1)
            : 0;

        return {
            horasOcupadas,
            horasDisponibles,
            horasLibres: Math.max(0, horasLibres),
            porcentajeOcupacion,
            materiasAsignadas: this.materiasAsignadas.length
        };
    }
}

export default new DocenteController();