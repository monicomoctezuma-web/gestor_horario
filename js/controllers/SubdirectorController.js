import Usuario from '../models/Usuario.js';
import Materia from '../models/Materia.js';
import Docente from '../models/Docente.js';
import Horario from '../models/Horario.js';

class SubdirectorController {
    constructor() {
        this.usuarios = [];
        this.materias = [];
        this.docentes = [];
        this.horarios = [];
    }

    // Gestión de Usuarios
    async cargarUsuarios() {
        this.usuarios = await Usuario.obtenerTodos();
        return this.usuarios;
    }

    async crearUsuario(usuario, password, rol, docenteId = null) {
        // Validar que el docente no tenga ya un usuario asignado
        if (rol === 'docente' && docenteId) {
            const usuarioExistente = this.usuarios.find(u => 
                u.rol === 'docente' && u.docenteId === docenteId
            );
            
            if (usuarioExistente) {
                return {
                    success: false,
                    mensaje: 'Este docente ya tiene un usuario asignado'
                };
            }
        }

        const resultado = await Usuario.crear(usuario, password, rol, docenteId);
        if (resultado.success) {
            await this.cargarUsuarios();
        }
        return resultado;
    }

    async editarUsuario(id, datos) {
        // Si se está asignando un docente, verificar que no esté ya asignado
        if (datos.rol === 'docente' && datos.docenteId) {
            const usuarioExistente = this.usuarios.find(u => 
                u.id !== id && u.rol === 'docente' && u.docenteId === datos.docenteId
            );
            
            if (usuarioExistente) {
                return {
                    success: false,
                    mensaje: 'Este docente ya tiene un usuario asignado'
                };
            }
        }

        const resultado = await Usuario.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarUsuarios();
        }
        return resultado;
    }

    async eliminarUsuario(id) {
        const resultado = await Usuario.eliminar(id);
        if (resultado.success) {
            await this.cargarUsuarios();
        }
        return resultado;
    }

    async obtenerUsuariosPorRol(rol) {
        return await Usuario.obtenerPorRol(rol);
    }

    // Vista General de Materias
    async cargarMaterias() {
        this.materias = await Materia.obtenerTodas();
        return this.materias;
    }

    obtenerMateriasPorSemestre() {
        const materiasPorSemestre = {};
        
        for (let i = 1; i <= 9; i++) {
            materiasPorSemestre[i] = this.materias.filter(m => m.semestre === i);
        }
        
        return materiasPorSemestre;
    }

    // Vista General de Docentes
    async cargarDocentes() {
        this.docentes = await Docente.obtenerTodos();
        return this.docentes;
    }

    async obtenerDocenteConDetalles(docenteId) {
        const docente = this.docentes.find(d => d.id === docenteId);
        if (!docente) return null;

        const horarios = await Horario.obtenerPorDocente(docenteId);
        const materiasIds = docente.materias || [];
        const materias = this.materias.filter(m => materiasIds.includes(m.id));

        return {
            ...docente,
            materiasDetalle: materias,
            horariosDetalle: horarios,
            horasOcupadas: horarios.length,
            horasLibres: docente.horasSemanales - horarios.length
        };
    }

    // Vista General de Horarios
    async cargarTodosLosHorarios() {
        this.horarios = await Horario.obtenerTodos();
        return this.horarios;
    }

    async obtenerHorariosPorSemestre(semestre) {
        return await Horario.obtenerPorSemestre(semestre);
    }

    async generarMatrizHorarioPorSemestre(semestre) {
        const horarios = await this.obtenerHorariosPorSemestre(semestre);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];

        const matriz = {};
        
        horas.forEach(hora => {
            matriz[hora] = {};
            dias.forEach(dia => {
                const horario = horarios.find(h => h.dia === dia && h.hora === hora);
                
                if (horario) {
                    const materia = this.materias.find(m => m.id === horario.materiaId);
                    const docente = this.docentes.find(d => d.id === horario.docenteId);
                    
                    matriz[hora][dia] = {
                        id: horario.id,
                        materia: materia?.nombre || 'Sin materia',
                        docente: docente?.nombre || 'Sin docente',
                        aula: horario.aula || 'Sin aula'
                    };
                } else {
                    matriz[hora][dia] = null;
                }
            });
        });

        return matriz;
    }

    // Estadísticas Generales
    async obtenerEstadisticasGenerales() {
        await this.cargarMaterias();
        await this.cargarDocentes();
        await this.cargarTodosLosHorarios();
        await this.cargarUsuarios();

        const totalMaterias = this.materias.length;
        const totalDocentes = this.docentes.length;
        const totalHorasAsignadas = this.horarios.length;
        
        let totalHorasDisponibles = 0;
        this.docentes.forEach(d => {
            totalHorasDisponibles += d.horasSemanales || 0;
        });

        const porcentajeOcupacion = totalHorasDisponibles > 0
            ? (totalHorasAsignadas / totalHorasDisponibles * 100).toFixed(1)
            : 0;

        const materiasPorSemestre = {};
        for (let i = 1; i <= 9; i++) {
            materiasPorSemestre[`semestre${i}`] = this.materias.filter(m => m.semestre === i).length;
        }

        return {
            totalMaterias,
            totalDocentes,
            totalHorasAsignadas,
            totalHorasDisponibles,
            horasLibres: Math.max(0, totalHorasDisponibles - totalHorasAsignadas),
            porcentajeOcupacion,
            materiasPorSemestre,
            totalUsuarios: this.usuarios.length,
            usuariosPorRol: {
                subdirector: this.usuarios.filter(u => u.rol === 'subdirector').length,
                jefe: this.usuarios.filter(u => u.rol === 'jefe').length,
                docente: this.usuarios.filter(u => u.rol === 'docente').length
            }
        };
    }

    // Reportes
    async obtenerConflictosHorario() {
        await this.cargarTodosLosHorarios();
        const conflictos = [];

        const grupos = {};
        this.horarios.forEach(h => {
            const clave = `${h.dia}-${h.hora}`;
            if (!grupos[clave]) {
                grupos[clave] = [];
            }
            grupos[clave].push(h);
        });

        Object.keys(grupos).forEach(clave => {
            const grupo = grupos[clave];
            
            const aulas = {};
            grupo.forEach(h => {
                if (h.aula) {
                    if (!aulas[h.aula]) {
                        aulas[h.aula] = [];
                    }
                    aulas[h.aula].push(h);
                }
            });

            Object.keys(aulas).forEach(aula => {
                if (aulas[aula].length > 1) {
                    conflictos.push({
                        tipo: 'aula',
                        aula,
                        horarios: aulas[aula],
                        mensaje: `Aula ${aula} asignada a múltiples grupos en ${clave}`
                    });
                }
            });

            const docentes = {};
            grupo.forEach(h => {
                if (h.docenteId) {
                    if (!docentes[h.docenteId]) {
                        docentes[h.docenteId] = [];
                    }
                    docentes[h.docenteId].push(h);
                }
            });

            Object.keys(docentes).forEach(docenteId => {
                if (docentes[docenteId].length > 1) {
                    const docente = this.docentes.find(d => d.id === docenteId);
                    conflictos.push({
                        tipo: 'docente',
                        docente: docente?.nombre || 'Desconocido',
                        horarios: docentes[docenteId],
                        mensaje: `Docente ${docente?.nombre || 'Desconocido'} asignado a múltiples grupos en ${clave}`
                    });
                }
            });
        });

        return conflictos;
    }
}

export default new SubdirectorController();