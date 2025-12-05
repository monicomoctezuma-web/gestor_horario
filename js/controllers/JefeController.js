//JefeController.js
import Materia from '../models/Materia.js';
import Docente from '../models/Docente.js';
import Horario from '../models/Horario.js';
import Grupo from '../models/Grupo.js';

class JefeController {
    constructor() {
        this.materias = [];
        this.docentes = [];
        this.horarios = [];
        this.grupos = [];
        this.todosLosHorarios = []; // 🔥 AGREGAR ESTA LÍNEA
    }

    // Gestión de Materias
    async cargarMaterias() {
        this.materias = await Materia.obtenerTodas();
        return this.materias;
    }

    async agregarMateria(nombre, creditos, semestre) {
        const resultado = await Materia.crear(nombre, creditos, semestre);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async editarMateria(id, datos) {
        const resultado = await Materia.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async eliminarMateria(id) {
        const resultado = await Materia.eliminar(id);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async obtenerMateriasPorSemestre(semestre) {
        return await Materia.obtenerPorSemestre(semestre);
    }

    // Gestión de Docentes
    async cargarDocentes() {
        this.docentes = await Docente.obtenerTodos();
        return this.docentes;
    }

    async agregarDocente(nombre, horasSemanales, usuarioId = null) {
        const resultado = await Docente.crear(nombre, horasSemanales, usuarioId);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    async editarDocente(id, datos) {
        const resultado = await Docente.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    async eliminarDocente(id) {
        const resultado = await Docente.eliminar(id);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    // Gestión de Horarios
   // Gestión de Horarios
    async cargarHorariosPorSemestre(semestre) {
        this.horarios = await Horario.obtenerPorSemestre(semestre);
        return this.horarios;
    }

    // 🔥 AGREGAR ESTE MÉTODO COMPLETO AQUÍ:
    async cargarTodosLosHorarios() {
        console.log('🔄 Cargando TODOS los horarios de TODOS los semestres...');
        this.todosLosHorarios = await Horario.obtenerTodos();
        console.log(`✅ Total de horarios cargados: ${this.todosLosHorarios.length}`);
        return this.todosLosHorarios;
    }
    async agregarHorario(semestre, dia, hora, materiaId, docenteId = null, aula = null) {
        if (docenteId || aula) {
            const disponibilidad = await Horario.verificarDisponibilidad(
                semestre, dia, hora, docenteId, aula
            );

            if (!disponibilidad.disponible) {
                return { 
                    success: false, 
                    mensaje: disponibilidad.mensaje 
                };
            }
        }

        const horarioExistente = this.horarios.find(h => 
            h.semestre === parseInt(semestre) &&
            h.dia === dia &&
            h.hora === hora &&
            h.materiaId === materiaId
        );

        if (horarioExistente) {
            return {
                success: false,
                mensaje: 'Esta materia ya está asignada en este día/hora'
            };
        }

        const resultado = await Horario.crear(
            semestre, dia, hora, materiaId, docenteId, aula
        );

        if (resultado.success) {
            await this.cargarHorariosPorSemestre(semestre);
            return { 
                success: true, 
                mensaje: 'Horario asignado correctamente' 
            };
        }

        return resultado;
    }

    async editarHorario(id, datos) {
        const resultado = await Horario.actualizar(id, datos);
        if (resultado.success) {
            const horario = this.horarios.find(h => h.id === id);
            if (horario) {
                await this.cargarHorariosPorSemestre(horario.semestre);
            }
        }
        return resultado;
    }

    async eliminarHorario(id) {
        const resultado = await Horario.eliminar(id);
        if (resultado.success) {
            this.horarios = this.horarios.filter(h => h.id !== id);
        }
        return resultado;
    }

    obtenerMateriaPorId(materiaId) {
        return this.materias.find(m => m.id === materiaId);
    }

    obtenerDocentePorId(docenteId) {
        return this.docentes.find(d => d.id === docenteId);
    }

    obtenerHorarioPorCelda(semestre, dia, hora) {
        return this.horarios.find(h => 
            h.semestre === parseInt(semestre) && 
            h.dia === dia && 
            h.hora === hora
        );
    }

    verificarMateriaAsignada(semestre, materiaId) {
        return this.horarios.some(h => 
            h.semestre === parseInt(semestre) && 
            h.materiaId === materiaId
        );
    }

    obtenerHorariosPorMateria(semestre, materiaId) {
        return this.horarios.filter(h => 
            h.semestre === parseInt(semestre) && 
            h.materiaId === materiaId
        );
    }

    materiaCompletamenteAsignada(semestre, materiaId) {
        const materia = this.obtenerMateriaPorId(materiaId);
        if (!materia) return false;

        const horariosMateria = this.obtenerHorariosPorMateria(semestre, materiaId);
        const creditos = parseInt(materia.creditos);

        return horariosMateria.length === creditos;
    }

    obtenerEstadisticasSemestre(semestre) {
        const materiasSemestre = this.materias.filter(m => 
            m.semestre === parseInt(semestre)
        );

        const totalMaterias = materiasSemestre.length;
        const materiasCompletas = materiasSemestre.filter(m => 
            this.materiaCompletamenteAsignada(semestre, m.id)
        ).length;
        const materiasParciales = materiasSemestre.filter(m => {
            const horarios = this.obtenerHorariosPorMateria(semestre, m.id);
            return horarios.length > 0 && !this.materiaCompletamenteAsignada(semestre, m.id);
        }).length;
        const materiasSinAsignar = totalMaterias - materiasCompletas - materiasParciales;

        return {
            totalMaterias,
            materiasCompletas,
            materiasParciales,
            materiasSinAsignar,
            porcentajeCompletado: totalMaterias > 0 
                ? Math.round((materiasCompletas / totalMaterias) * 100) 
                : 0
        };
    }

    // Gestión de Grupos
    async cargarGrupos() {
        this.grupos = await Grupo.obtenerTodos();
        return this.grupos;
    }

    async cargarGruposPorSemestre(semestre) {
        this.grupos = await Grupo.obtenerPorSemestre(semestre);
        return this.grupos;
    }

    async agregarGrupo(nombre, semestre, materiaId, docenteId, cantidadAlumnos) {
        const resultado = await Grupo.crear(nombre, semestre, materiaId, docenteId, cantidadAlumnos);
        if (resultado.success) {
            await this.cargarGruposPorSemestre(semestre);
        }
        return resultado;
    }

    async editarGrupo(id, datos) {
        const resultado = await Grupo.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarGrupos();
        }
        return resultado;
    }

    async eliminarGrupo(id) {
        const resultado = await Grupo.eliminar(id);
        if (resultado.success) {
            await this.cargarGrupos();
        }
        return resultado;
    }

    obtenerMateriasDocente(docenteId) {
        const docente = this.docentes.find(d => d.id === docenteId);
        if (!docente || !docente.materias) return [];
        
        return this.materias.filter(m => docente.materias.includes(m.id));
    }

    obtenerGrupoPorId(grupoId) {
        return this.grupos.find(g => g.id === grupoId);
    }


 // ============================================================
// 🔥 MÉTODO CORREGIDO: asignarHorarioCompleto
// ============================================================
async asignarHorarioCompleto(semestre, hora, materiaId, docenteId, aula) {
        console.log('🎯 Iniciando asignación completa:', { semestre, hora, materiaId, docenteId, aula });
        
        // 🔥 AGREGAR ESTA LÍNEA AL INICIO
        await this.cargarTodosLosHorarios();
        
        const materia = this.obtenerMateriaPorId(materiaId);
        if (!materia) {
            return {
                success: false,
                mensaje: '❌ Materia no encontrada'
            };
        }

        const docente = this.obtenerDocentePorId(docenteId);
        if (!docente) {
            return {
                success: false,
                mensaje: '❌ Docente no encontrado'
            };
        }

        const creditos = parseInt(materia.creditos);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const diasAsignar = dias.slice(0, creditos);

        console.log(`📚 Materia: ${materia.nombre} (${creditos} créditos)`);
        console.log(`📅 Días requeridos: ${diasAsignar.join(', ')}`);

        // ============================================================
        // VALIDACIÓN 1: Verificar si YA existe esta materia en esta hora
        // ============================================================
        // 🔥 CAMBIAR this.horarios POR this.todosLosHorarios
        const yaExiste = this.todosLosHorarios.some(h => 
            h.semestre === parseInt(semestre) &&
            h.hora === hora &&
            h.materiaId === materiaId
        );

        if (yaExiste) {
            return {
                success: false,
                mensaje: `❌ La materia "${materia.nombre}" ya está asignada en ${hora}`
            };
        }

        // ============================================================
        // VALIDACIÓN 2: BLOQUEO DE MATERIAS DE 4 CRÉDITOS
        // ============================================================
        const materiasEnHora = [];
        // 🔥 CAMBIAR this.horarios POR this.todosLosHorarios
        for (const horario of this.todosLosHorarios) {
            if (horario.semestre === parseInt(semestre) && horario.hora === hora) {
                if (!materiasEnHora.includes(horario.materiaId)) {
                    materiasEnHora.push(horario.materiaId);
                }
            }
        }

        for (const materiaIdExistente of materiasEnHora) {
            const materiaExistente = this.obtenerMateriaPorId(materiaIdExistente);
            if (materiaExistente && parseInt(materiaExistente.creditos) === 4) {
                return {
                    success: false,
                    mensaje: `❌ NO SE PUEDE ASIGNAR\n\n` +
                            `La materia "${materiaExistente.nombre}" (4 créditos) ya ocupa esta hora.\n\n` +
                            `⚠️ Las materias de 4 créditos bloquean TODA la hora completa,\n` +
                            `incluso si hay días individuales libres.\n\n` +
                            `Por favor, selecciona otra hora.`
                };
            }
        }

        if (creditos === 4 && materiasEnHora.length > 0) {
            return {
                success: false,
                mensaje: `❌ NO SE PUEDE ASIGNAR\n\n` +
                        `"${materia.nombre}" tiene 4 créditos y requiere\n` +
                        `que la hora ${hora} esté COMPLETAMENTE LIBRE.\n\n` +
                        `Actualmente hay ${materiasEnHora.length} materia(s) en esta hora.\n\n` +
                        `Por favor, elimina las materias existentes o selecciona otra hora.`
            };
        }

        // ============================================================
        // VALIDACIÓN 3: TODOS LOS DÍAS DEBEN ESTAR LIBRES
        // ============================================================
        const diasOcupados = [];
        for (const dia of diasAsignar) {
            // 🔥 CAMBIAR this.horarios POR this.todosLosHorarios
            const ocupado = this.todosLosHorarios.find(h => 
                h.semestre === parseInt(semestre) &&
                h.dia === dia &&
                h.hora === hora
            );
            
            if (ocupado) {
                const materiaOcupa = this.obtenerMateriaPorId(ocupado.materiaId);
                diasOcupados.push({
                    dia,
                    materia: materiaOcupa ? materiaOcupa.nombre : 'Materia desconocida',
                    docente: ocupado.docenteId ? this.obtenerDocentePorId(ocupado.docenteId)?.nombre : 'Sin docente',
                    aula: ocupado.aula || 'Sin aula'
                });
            }
        }

        if (diasOcupados.length > 0) {
            const detalles = diasOcupados.map(d => 
                `  • ${d.dia}: "${d.materia}" con ${d.docente} en ${d.aula}`
            ).join('\n');
            
            return {
                success: false,
                mensaje: `❌ NO TODOS LOS DÍAS ESTÁN LIBRES\n\n` +
                        `"${materia.nombre}" requiere ${creditos} días: ${diasAsignar.join(', ')}\n\n` +
                        `⚠️ Los siguientes días YA están ocupados:\n\n${detalles}\n\n` +
                        `Por favor, selecciona una hora donde TODOS los días requeridos estén libres.`
            };
        }

        // ============================================================
        // VALIDACIÓN 4: CONFLICTOS DE DOCENTE EN TODOS LOS DÍAS
        // ============================================================
        const conflictosDocente = [];
        for (const dia of diasAsignar) {
            // 🔥 CAMBIAR this.horarios POR this.todosLosHorarios Y QUITAR FILTRO DE SEMESTRE
            const docenteOcupado = this.todosLosHorarios.find(h => 
                h.docenteId === docenteId && 
                h.hora === hora && 
                h.dia === dia
            );
            
            if (docenteOcupado) {
                const materiaConflicto = this.obtenerMateriaPorId(docenteOcupado.materiaId);
                conflictosDocente.push({
                    dia,
                    semestre: docenteOcupado.semestre, // 🔥 AGREGAR SEMESTRE
                    materia: materiaConflicto ? materiaConflicto.nombre : 'Desconocida',
                    aula: docenteOcupado.aula || 'Sin aula'
                });
            }
        }

        if (conflictosDocente.length > 0) {
            const detalles = conflictosDocente.map(c => 
                `  • ${c.dia}: "${c.materia}" en ${c.aula} (Semestre ${c.semestre})` // 🔥 MOSTRAR SEMESTRE
            ).join('\n');
            
            return {
                success: false,
                mensaje: `❌ CONFLICTO DE DOCENTE\n\n` +
                        `${docente.nombre} ya tiene clases en ${hora}:\n\n${detalles}\n\n` +
                        `⚠️ Un docente no puede dar dos clases al mismo tiempo.`
            };
        }

        // ============================================================
        // 🔥 VALIDACIÓN 5: BLOQUEO ABSOLUTO DE AULA (CAMBIO CRÍTICO)
        // ============================================================
        console.log(`🔍 Verificando disponibilidad del aula ${aula} en ${hora}...`);
        
        // 🔥 QUITAR COMPLETAMENTE EL FILTRO DE SEMESTRE
        const aulaOcupadaEnHora = this.todosLosHorarios.find(h => 
            h.aula === aula && 
            h.hora === hora
            // ⚠️ NO hay h.semestre - buscamos en TODOS los semestres
        );

        if (aulaOcupadaEnHora) {
            const materiaQueOcupa = this.obtenerMateriaPorId(aulaOcupadaEnHora.materiaId);
            const docenteQueOcupa = this.obtenerDocentePorId(aulaOcupadaEnHora.docenteId);
            
            // Encontrar TODOS los días que ocupa esta aula en esta hora
            const todosLosHorariosDelAula = this.todosLosHorarios.filter(h => 
                h.aula === aula && 
                h.hora === hora
            );
            
            const diasOcupados = [...new Set(todosLosHorariosDelAula.map(h => h.dia))];
            
            console.log(`❌ AULA OCUPADA:`, {
                aula,
                hora,
                semestreQueOcupa: aulaOcupadaEnHora.semestre,
                materiaQueOcupa: materiaQueOcupa?.nombre,
                diasOcupados
            });
            
            return {
                success: false,
                mensaje: `❌ AULA NO DISPONIBLE\n\n` +
                        `El aula ${aula} ya está ocupada en ${hora} por:\n\n` +
                        `📚 Materia: "${materiaQueOcupa ? materiaQueOcupa.nombre : 'Desconocida'}"\n` +
                        `👨‍🏫 Docente: ${docenteQueOcupa ? docenteQueOcupa.nombre : 'Desconocido'}\n` +
                        `🎓 Semestre: ${aulaOcupadaEnHora.semestre}\n` +
                        `📅 Días ocupados: ${diasOcupados.join(', ')}\n\n` +
                        `⚠️ UNA AULA FÍSICA NO PUEDE TENER DOS CLASES SIMULTÁNEAS,\n` +
                        `SIN IMPORTAR SI SON DE DIFERENTES SEMESTRES.\n\n` +
                        `🔧 Solución: Selecciona otra aula disponible.`
            };
        }

        console.log(`✅ Aula ${aula} disponible en ${hora}`);

        // ============================================================
        // VALIDACIÓN 6: HORAS DISPONIBLES DEL DOCENTE
        // ============================================================
        // 🔥 CAMBIAR this.horarios POR this.todosLosHorarios
        const horasActuales = this.todosLosHorarios.filter(h => h.docenteId === docenteId).length;
        const horasSemanales = parseInt(docente.horasSemanales);
        
        if (horasActuales + creditos > horasSemanales) {
            const disponibles = horasSemanales - horasActuales;
            return {
                success: false,
                mensaje: `❌ CAPACIDAD INSUFICIENTE\n\n` +
                        `${docente.nombre} tiene:\n` +
                        `• ${horasActuales} horas asignadas\n` +
                        `• ${horasSemanales} horas semanales disponibles\n` +
                        `• ${disponibles} horas libres\n\n` +
                        `Esta materia requiere ${creditos} horas.\n\n` +
                        `Faltan ${creditos - disponibles} horas.`
            };
        }

        // ============================================================
        // ✅ TODAS LAS VALIDACIONES PASARON - CREAR HORARIOS
        // ============================================================
        console.log('✅ Todas las validaciones pasaron. Creando horarios múltiples...');
        
        const resultado = await Horario.crearMultiple(
            semestre,
            diasAsignar,
            hora,
            materiaId,
            docenteId,
            aula
        );

        if (resultado.success) {
            // 🔥 RECARGAR AMBOS: todosLosHorarios Y horarios del semestre
            await this.cargarTodosLosHorarios();
            await this.cargarHorariosPorSemestre(semestre);
            
            console.log('🎉 Asignación completa exitosa');
            
            return {
                success: true,
                mensaje: `✅ HORARIO ASIGNADO CORRECTAMENTE\n\n` +
                         `📚 Materia: ${materia.nombre}\n` +
                         `👨‍🏫 Docente: ${docente.nombre}\n` +
                         `🏫 Aula: ${aula}\n` +
                         `📅 Días: ${diasAsignar.join(', ')}\n` +
                         `🕐 Hora: ${hora}`,
                diasAsignados: diasAsignar.length
            };
        } else {
            console.error('❌ Error en asignación:', resultado.mensaje);
            return {
                success: false,
                mensaje: `❌ ERROR AL ASIGNAR HORARIO\n\n${resultado.mensaje}`
            };
        }
    }
}

export default new JefeController();