import AuthController from '../controllers/AuthController.js';
import JefeController from '../controllers/JefeController.js';

class JefeView {
    constructor() {
        this.init();
    }

    async init() {
        if (!AuthController.verificarRol('jefe')) {
            return;
        }

        const usuario = AuthController.obtenerSesion();
        document.getElementById('userName').textContent = usuario.usuario;

        this.setupEventListeners();
        await this.cargarMaterias();
        await this.cargarDocentes();
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../index.html';
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.cambiarTab(e.target.dataset.tab));
        });

        document.getElementById('btnAgregarMateria').addEventListener('click', () => this.abrirModalMateria());
        document.getElementById('closeModalMateria').addEventListener('click', () => this.cerrarModalMateria());
        document.getElementById('formMateria').addEventListener('submit', (e) => this.guardarMateria(e));
        document.getElementById('filtroSemestre').addEventListener('change', () => this.cargarMaterias());

        document.getElementById('btnAgregarDocente').addEventListener('click', () => this.abrirModalDocente());
        document.getElementById('closeModalDocente').addEventListener('click', () => this.cerrarModalDocente());
        document.getElementById('formDocente').addEventListener('submit', (e) => this.guardarDocente(e));

        document.getElementById('btnCargarHorario').addEventListener('click', () => this.cargarHorario());
        document.getElementById('btnCargarAula').addEventListener('click', () => this.cargarHorarioAula());

        document.getElementById('btnCargarGrupos').addEventListener('click', () => this.cargarGrupos());
        document.getElementById('btnAgregarGrupo').addEventListener('click', () => this.abrirModalGrupo());
        document.getElementById('closeModalGrupo').addEventListener('click', () => this.cerrarModalGrupo());
        document.getElementById('formGrupo').addEventListener('submit', (e) => this.guardarGrupo(e));
    }

    cambiarTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        if (tabName === 'grupos') {
            this.cargarGrupos();
        }
    }

    // === MATERIAS ===
    async cargarMaterias() {
        const filtro = document.getElementById('filtroSemestre').value;
        let materias;
        
        if (filtro) {
            materias = await JefeController.obtenerMateriasPorSemestre(filtro);
        } else {
            materias = await JefeController.cargarMaterias();
        }

        this.renderizarMaterias(materias);
    }

    renderizarMaterias(materias) {
        const tbody = document.querySelector('#tablaMaterias tbody');
        tbody.innerHTML = '';

        if (materias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay materias registradas</td></tr>';
            return;
        }

        materias.forEach(materia => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${materia.nombre}</td>
                <td>${materia.creditos}</td>
                <td>Semestre ${materia.semestre}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="jefeView.editarMateria('${materia.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="jefeView.eliminarMateria('${materia.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    abrirModalMateria(materiaId = null) {
        const modal = document.getElementById('modalMateria');
        const form = document.getElementById('formMateria');
        form.reset();

        if (materiaId) {
            document.getElementById('tituloModalMateria').textContent = 'Editar Materia';
            const materia = JefeController.materias.find(m => m.id === materiaId);
            
            document.getElementById('materiaId').value = materia.id;
            document.getElementById('materiaNombre').value = materia.nombre;
            document.getElementById('materiaCreditos').value = materia.creditos;
            document.getElementById('materiaSemestre').value = materia.semestre;
        } else {
            document.getElementById('tituloModalMateria').textContent = 'Agregar Materia';
            document.getElementById('materiaId').value = '';
        }

        modal.classList.add('show');
    }

    cerrarModalMateria() {
        document.getElementById('modalMateria').classList.remove('show');
    }

    async guardarMateria(e) {
        e.preventDefault();
        
        const id = document.getElementById('materiaId').value;
        const nombre = document.getElementById('materiaNombre').value;
        const creditos = document.getElementById('materiaCreditos').value;
        const semestre = document.getElementById('materiaSemestre').value;

        let resultado;
        if (id) {
            resultado = await JefeController.editarMateria(id, { nombre, creditos, semestre });
        } else {
            resultado = await JefeController.agregarMateria(nombre, creditos, semestre);
        }

        if (resultado.success) {
            this.cerrarModalMateria();
            await this.cargarMaterias();
            alert(id ? 'Materia actualizada' : 'Materia agregada correctamente');
        } else {
            alert('Error al guardar materia');
        }
    }

    editarMateria(id) {
        this.abrirModalMateria(id);
    }

    async eliminarMateria(id) {
        if (confirm('¿Está seguro de eliminar esta materia?')) {
            const resultado = await JefeController.eliminarMateria(id);
            if (resultado.success) {
                await this.cargarMaterias();
                alert('Materia eliminada');
            } else {
                alert('Error al eliminar materia');
            }
        }
    }

    // === DOCENTES ===
    async cargarDocentes() {
        const docentes = await JefeController.cargarDocentes();
        this.renderizarDocentes(docentes);
    }

    async renderizarDocentes(docentes) {
        const tbody = document.querySelector('#tablaDocentes tbody');
        tbody.innerHTML = '';

        if (docentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay docentes registrados</td></tr>';
            return;
        }

        await JefeController.cargarMaterias();
        const todasMaterias = JefeController.materias;

        docentes.forEach(docente => {
            const tr = document.createElement('tr');
            
            const materiasIds = docente.materias || [];
            const nombresMaterias = materiasIds
                .map(id => {
                    const materia = todasMaterias.find(m => m.id === id);
                    return materia ? materia.nombre : null;
                })
                .filter(nombre => nombre !== null);
            
            let htmlMaterias = '';
            if (nombresMaterias.length > 0) {
                htmlMaterias = nombresMaterias.map(nombre => 
                    `<span style="display:inline-block; background:#9c27b0; color:white; padding:4px 8px; border-radius:12px; margin:2px 4px 2px 0; font-size:0.85em; white-space: nowrap;">${nombre}</span>`
                ).join('');
            } else {
                htmlMaterias = '<span style="color:#999; font-style:italic;">Sin materias asignadas</span>';
            }
            
            tr.innerHTML = `
                <td>${docente.nombre}</td>
                <td>${docente.horasSemanales}</td>
                <td>
                    <div style="max-width: 500px; white-space: normal; line-height: 2.2; padding: 5px 0;">
                        ${htmlMaterias}
                    </div>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="jefeView.editarDocente('${docente.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="jefeView.eliminarDocente('${docente.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    abrirModalDocente(docenteId = null) {
        const modal = document.getElementById('modalDocente');
        const form = document.getElementById('formDocente');
        form.reset();

        if (docenteId) {
            document.getElementById('tituloModalDocente').textContent = 'Editar Docente';
            const docente = JefeController.docentes.find(d => d.id === docenteId);
            
            document.getElementById('docenteId').value = docente.id;
            document.getElementById('docenteNombre').value = docente.nombre;
            document.getElementById('docenteHoras').value = docente.horasSemanales;
        } else {
            document.getElementById('tituloModalDocente').textContent = 'Agregar Docente';
            document.getElementById('docenteId').value = '';
        }

        modal.classList.add('show');
    }

    cerrarModalDocente() {
        document.getElementById('modalDocente').classList.remove('show');
    }

    async guardarDocente(e) {
        e.preventDefault();
        
        const id = document.getElementById('docenteId').value;
        const nombre = document.getElementById('docenteNombre').value;
        const horas = document.getElementById('docenteHoras').value;

        let resultado;
        if (id) {
            resultado = await JefeController.editarDocente(id, { nombre, horasSemanales: horas });
        } else {
            resultado = await JefeController.agregarDocente(nombre, horas);
        }

        if (resultado.success) {
            this.cerrarModalDocente();
            await this.cargarDocentes();
            alert(id ? 'Docente actualizado' : 'Docente agregado correctamente');
        } else {
            alert('Error al guardar docente');
        }
    }

    editarDocente(id) {
        this.abrirModalDocente(id);
    }

    async eliminarDocente(id) {
        if (confirm('¿Está seguro de eliminar este docente?')) {
            const resultado = await JefeController.eliminarDocente(id);
            if (resultado.success) {
                await this.cargarDocentes();
                alert('Docente eliminado');
            } else {
                alert('Error al eliminar docente');
            }
        }
    }

    // === HORARIOS ===
    async cargarHorario() {
        const semestre = document.getElementById('semestreHorario').value;
        await JefeController.cargarMaterias();
        await JefeController.cargarDocentes();
        await JefeController.cargarHorariosPorSemestre(semestre);
        
        this.renderizarHorarioPorHoras(semestre);
    }

    renderizarHorarioPorHoras(semestre) {
        const container = document.getElementById('horarioContainer');
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];
        
        const materiasSemestre = JefeController.materias.filter(m => 
            m.semestre === parseInt(semestre)
        );

        if (materiasSemestre.length === 0) {
            container.innerHTML = `
                <div class="alert-warning">
                    ⚠️ No hay materias registradas para este semestre.
                    Por favor, agrega materias primero en la pestaña "Materias".
                </div>
            `;
            return;
        }

        let html = `
            <div class="info-banner">
                <strong>💡 Instrucciones:</strong> Selecciona una materia para cada hora, luego selecciona el docente que la impartirá. 
                Los días se pintarán automáticamente según los créditos de la materia.
            </div>
            
            <table class="horario-limpio">
                <thead>
                    <tr>
                        <th style="width: 120px;">Hora</th>
                        <th style="width: 250px;">Materia</th>
                        ${dias.map(dia => `<th>${dia}</th>`).join('')}
                        <th style="width: 200px;">Docente</th>
                        <th style="width: 150px;">Aula</th>
                    </tr>
                </thead>
                <tbody>
        `;

        horas.forEach(hora => {
            const materiasAsignadasEnHora = this.obtenerMateriasAsignadasEnHora(semestre, hora);
            const materiasDisponibles = materiasSemestre.filter(m => 
                !materiasAsignadasEnHora.some(ma => ma.id === m.id)
            );

            const horarioEnHora = JefeController.horarios.find(h => h.hora === hora);
            const materiaAsignada = horarioEnHora ? JefeController.obtenerMateriaPorId(horarioEnHora.materiaId) : null;
            const docenteAsignado = horarioEnHora ? JefeController.obtenerDocentePorId(horarioEnHora.docenteId) : null;

            html += `<tr>`;
            html += `<td class="hora-cell"><strong>${hora}</strong></td>`;
            html += `<td class="celda-selector-inline">`;
            
            if (materiaAsignada) {
                html += `<div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; padding: 8px; background: #e8f5e9; border-radius: 4px; color: #2e7d32; font-weight: 500;">
                        📚 ${materiaAsignada.nombre}
                    </div>
                    <button class="btn btn-danger btn-sm" 
                        onclick="jefeView.eliminarAsignacionCompleta('${hora}', ${semestre})"
                        title="Eliminar asignación">
                        🗑️
                    </button>
                </div>`;
            } else if (materiasDisponibles.length > 0) {
                html += `<select class="selector-materia" 
                    id="materia_${hora.replace(/:/g, '-')}" 
                    onchange="jefeView.onMateriaSeleccionada('${hora}', this.value, ${semestre})">
                    <option value="">➕ Seleccionar materia...</option>
                    ${materiasDisponibles.map(m => 
                        `<option value="${m.id}">${m.nombre} (${m.creditos} créd.)</option>`
                    ).join('')}
                </select>`;
            } else {
                html += `<div class="sin-materias-inline">✓ Completo</div>`;
            }
            
            html += `</td>`;
            
            dias.forEach((dia) => {
                const horarioEnDia = JefeController.horarios.find(h => 
                    h.hora === hora && h.dia === dia
                );
                
                if (horarioEnDia) {
                    const materia = JefeController.obtenerMateriaPorId(horarioEnDia.materiaId);
                    const creditos = materia ? parseInt(materia.creditos) : 1;
                    
                    html += `<td class="dia-asignado creditos-${creditos}" 
                                onclick="jefeView.desasignarHorario('${horarioEnDia.id}', ${semestre})"
                                title="${materia ? materia.nombre : ''} - Click para desasignar">
                        ✓
                    </td>`;
                } else {
                    html += `<td class="dia-vacio-limpio">-</td>`;
                }
            });
            
            html += `<td class="celda-selector-inline">`;
            
            if (docenteAsignado) {
                html += `<div style="padding: 8px; background: #e3f2fd; border-radius: 4px; color: #1565c0; font-weight: 500;">
                    👨‍🏫 ${docenteAsignado.nombre}
                </div>`;
            } else {
                html += `<select class="selector-docente" 
                    id="docente_${hora.replace(/:/g, '-')}" 
                    disabled 
                    style="background: #f0f0f0; width: 100%;">
                    <option value="">Primero selecciona materia</option>
                </select>`;
            }
            
            html += `</td>`;
            html += `<td class="celda-selector-inline">`;
            
            if (horarioEnHora && horarioEnHora.aula) {
                html += `<div style="padding: 8px; background: #fff3e0; border-radius: 4px; color: #e65100; font-weight: 500;">
                    🏫 ${horarioEnHora.aula}
                </div>`;
            } else {
                html += `<select class="selector-aula" 
                    id="aula_${hora.replace(/:/g, '-')}" 
                    disabled 
                    style="background: #f0f0f0; width: 100%;">
                    <option value="">Selecciona docente primero</option>
                </select>`;
            }
            
            html += `</td>`;
            html += `</tr>`; 
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    obtenerMateriasAsignadasEnHora(semestre, hora) {
        const materiasIds = new Set();
        const materias = [];
        
        JefeController.horarios.forEach(h => {
            if (h.hora === hora && !materiasIds.has(h.materiaId)) {
                materiasIds.add(h.materiaId);
                const materia = JefeController.obtenerMateriaPorId(h.materiaId);
                if (materia) {
                    materias.push(materia);
                }
            }
        });
        
        return materias;
    }

    onMateriaSeleccionada(hora, materiaId, semestre) {
        if (!materiaId) {
            const docenteSelect = document.getElementById(`docente_${hora.replace(/:/g, '-')}`);
            docenteSelect.disabled = true;
            docenteSelect.style.background = '#f0f0f0';
            docenteSelect.innerHTML = '<option value="">Primero selecciona materia</option>';
            return;
        }

        const materia = JefeController.obtenerMateriaPorId(materiaId);
        if (!materia) return;

        const docentesDisponibles = JefeController.docentes.filter(docente => {
            const materiasDocente = docente.materias || [];
            return materiasDocente.includes(materiaId);
        });

        console.log('👨‍🏫 Docentes disponibles para', materia.nombre, ':', docentesDisponibles);

        const docenteSelect = document.getElementById(`docente_${hora.replace(/:/g, '-')}`);
        docenteSelect.disabled = false;
        docenteSelect.style.background = 'white';
        
        if (docentesDisponibles.length > 0) {
            docenteSelect.innerHTML = `
                <option value="">👨‍🏫 Seleccionar docente...</option>
                ${docentesDisponibles.map(d => 
                    `<option value="${d.id}">${d.nombre}</option>`
                ).join('')}
            `;
            
            docenteSelect.onchange = () => {
                const docenteId = docenteSelect.value;
                if (docenteId) {
                    this.habilitarSelectorAula(materiaId, docenteId, hora, semestre);
                }
            };
        } else {
            docenteSelect.innerHTML = '<option value="">⚠️ No hay docentes disponibles</option>';
            alert(`⚠️ No hay docentes capacitados para impartir "${materia.nombre}".\n\nPor favor, asigna esta materia a un docente primero.`);
        }
    }

    habilitarSelectorAula(materiaId, docenteId, hora, semestre) {
        const aulas = [
            'A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'A-107', 'A-108', 'A-109', 'A-110',
            'B-201', 'B-202', 'B-203', 'B-204', 'B-205',
            'C-301', 'C-302', 'C-303', 'C-304', 'C-305'
        ];

        const aulasDisponibles = aulas.filter(aula => {
            return !JefeController.horarios.some(h => 
                h.aula === aula && h.hora === hora
            );
        });

        const aulaSelect = document.getElementById(`aula_${hora.replace(/:/g, '-')}`);
        aulaSelect.disabled = false;
        aulaSelect.style.background = 'white';
        
        if (aulasDisponibles.length > 0) {
            aulaSelect.innerHTML = `
                <option value="">🏫 Seleccionar aula...</option>
                ${aulasDisponibles.map(aula => 
                    `<option value="${aula}">${aula}</option>`
                ).join('')}
            `;
            
            aulaSelect.onchange = async () => {
                const aula = aulaSelect.value;
                if (aula) {
                    // 🔥 CAMBIO CRÍTICO: Usar asignarHorarioCompleto
                    await this.asignarHorarioCompletoDesdeVista(materiaId, docenteId, hora, semestre, aula);
                }
            };
        } else {
            aulaSelect.innerHTML = '<option value="">⚠️ No hay aulas disponibles</option>';
            alert('⚠️ Todas las aulas están ocupadas en esta hora.');
        }
    }

    // 🔥 NUEVO MÉTODO: Llama al método correcto del controlador
    async asignarHorarioCompletoDesdeVista(materiaId, docenteId, hora, semestre, aula) {
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        const docente = JefeController.obtenerDocentePorId(docenteId);
        
        if (!materia || !docente) return;

        const creditos = parseInt(materia.creditos);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const diasAsignar = dias.slice(0, creditos);

        if (!confirm(`¿Asignar "${materia.nombre}" con ${docente.nombre} en ${aula} a las ${hora}?\n\nDías: ${diasAsignar.join(', ')}`)) {
            document.getElementById(`materia_${hora.replace(/:/g, '-')}`).value = '';
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).disabled = true;
            document.getElementById(`aula_${hora.replace(/:/g, '-')}`).disabled = true;
            return;
        }

        // 🔥 USAR EL MÉTODO CON TODAS LAS VALIDACIONES
        const resultado = await JefeController.asignarHorarioCompleto(
            semestre, hora, materiaId, docenteId, aula
        );

        if (resultado.success) {
            alert(resultado.mensaje);
            await this.cargarHorario();
        } else {
            alert(resultado.mensaje);
            // Resetear selectores
            document.getElementById(`materia_${hora.replace(/:/g, '-')}`).value = '';
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).disabled = true;
            document.getElementById(`aula_${hora.replace(/:/g, '-')}`).disabled = true;
        }
    }

    async desasignarHorario(horarioId, semestre) {
        if (!confirm('¿Desasignar este día?')) {
            return;
        }

        const resultado = await JefeController.eliminarHorario(horarioId);
        if (resultado.success) {
            await this.cargarHorario();
            alert('✅ Desasignado correctamente');
        } else {
            alert('❌ Error al desasignar');
        }
    }

    async eliminarAsignacionCompleta(hora, semestre) {
        if (!confirm('¿Eliminar esta materia de esta hora?\n\nSe eliminarán todos los días asignados.')) {
            return;
        }

        const horariosAEliminar = JefeController.horarios.filter(h => 
            h.hora === hora && h.semestre === parseInt(semestre)
        );

        for (const horario of horariosAEliminar) {
            await JefeController.eliminarHorario(horario.id);
        }

        alert(`✅ Eliminado (${horariosAEliminar.length} días liberados)`);
        await this.cargarHorario();
    }

    // === AULAS ===
    async cargarHorarioAula() {
        const aula = document.getElementById('aulaSelect').value;
        await JefeController.cargarMaterias();
        await JefeController.cargarDocentes();
        
        this.todosLosHorarios = [];
        for (let sem = 1; sem <= 9; sem++) {
            const horarios = await JefeController.cargarHorariosPorSemestre(sem);
            this.todosLosHorarios = this.todosLosHorarios.concat(horarios);
        }
        
        this.renderizarHorarioAula(aula);
    }

    async renderizarHorarioAula(aula) {
        const container = document.getElementById('aulaContainer');
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];

        await JefeController.cargarGrupos();

        let html = `
            <div class="info-banner">
                <strong>🏫 Horario del Aula ${aula}</strong> - Verde = Ocupado | Gris = Disponible
            </div>
            
            <table class="horario-limpio">
                <thead>
                    <tr>
                        <th style="width: 120px;">Hora</th>
                        ${dias.map(dia => `<th>${dia}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        horas.forEach(hora => {
            html += `<tr><td class="hora-cell"><strong>${hora}</strong></td>`;
            
            dias.forEach(dia => {
                const horario = this.todosLosHorarios.find(h => 
                    h.aula === aula && h.hora === hora && h.dia === dia
                );

                if (horario) {
                    const materia = JefeController.obtenerMateriaPorId(horario.materiaId);
                    const docente = JefeController.obtenerDocentePorId(horario.docenteId);
                    
                    const grupo = JefeController.grupos.find(g => 
                        g.materiaId === horario.materiaId && 
                        g.docenteId === horario.docenteId &&
                        g.semestre === horario.semestre
                    );
                    
                    html += `<td class="dia-asignado" style="background: #4caf50; color: white; cursor: pointer;" 
                        title="${materia ? materia.nombre : ''} - ${docente ? docente.nombre : ''} - ${grupo ? 'Grupo: ' + grupo.nombre : ''} - Semestre ${horario.semestre}">
                        <div style="font-size: 0.85em; font-weight: bold;">📚 ${materia ? materia.nombre : 'N/A'}</div>
                        <div style="font-size: 0.75em;">👨‍🏫 ${docente ? docente.nombre : 'N/A'}</div>
                        ${grupo ? `<div style="font-size: 0.75em;">👥 Grupo: ${grupo.nombre}</div>` : ''}
                        <div style="font-size: 0.7em;">Sem. ${horario.semestre}</div>
                    </td>`;
                } else {
                    html += `<td style="background: #f5f5f5; text-align: center; color: #999;">Disponible</td>`;
                }
            });

            html += `</tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    // === GESTIÓN DE GRUPOS ===
    async cargarGrupos() {
        const semestre = document.getElementById('semestreGrupos').value;
        
        console.log('🔍 Cargando grupos para semestre:', semestre);
        
        await JefeController.cargarMaterias();
        await JefeController.cargarDocentes();
        await JefeController.cargarGruposPorSemestre(semestre);
        
        console.log('📊 Grupos cargados:', JefeController.grupos);
        
        this.renderizarGrupos(JefeController.grupos);
    }

    async renderizarGrupos(grupos) {
        const tbody = document.querySelector('#tablaGrupos tbody');
        
        if (!tbody) {
            console.error('❌ No se encontró el tbody de la tabla de grupos');
            return;
        }
        
        tbody.innerHTML = '';

        if (grupos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">No hay grupos registrados para este semestre</td></tr>';
            return;
        }

        const semestre = document.getElementById('semestreGrupos').value;
        await JefeController.cargarHorariosPorSemestre(semestre);

        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        grupos.forEach(grupo => {
            const tr = document.createElement('tr');
            
            const materia = JefeController.obtenerMateriaPorId(grupo.materiaId);
            const docente = JefeController.obtenerDocentePorId(grupo.docenteId);
            
            const horariosMateria = JefeController.horarios.filter(h => 
                h.materiaId === grupo.materiaId
            );
            
            const aula = horariosMateria.length > 0 ? horariosMateria[0].aula : 'Sin asignar';
            const hora = horariosMateria.length > 0 ? horariosMateria[0].hora : 'Sin asignar';
            
            let diasHTML = '';
            dias.forEach(dia => {
                const tieneClase = horariosMateria.some(h => h.dia === dia);
                if (tieneClase) {
                    diasHTML += `<td style="text-align: center; background: #4caf50; color: white; font-weight: bold;">✓</td>`;
                } else {
                    diasHTML += `<td style="text-align: center; color: #ccc;">-</td>`;
                }
            });
            
            tr.innerHTML = `
                <td><strong style="color: #9c27b0; font-size: 1.05em;">${grupo.nombre}</strong></td>
                <td style="text-align: center; font-weight: 500; color: #1976d2;">🕐 ${hora}</td>
                <td>${docente ? docente.nombre : 'N/A'}</td>
                <td>${materia ? materia.nombre : 'N/A'}</td>
                ${diasHTML}
                <td style="text-align: center; font-weight: 500; color: #e65100;">🏫 ${aula}</td>
                <td style="text-align: center;">
                    <span style="background: #2196f3; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 500;">
                        ${grupo.cantidadAlumnos}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="jefeView.editarGrupo('${grupo.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="jefeView.eliminarGrupo('${grupo.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async abrirModalGrupo(grupoId = null) {
        console.log('🔓 Abriendo modal de grupo. ID:', grupoId);
        
        const modal = document.getElementById('modalGrupo');
        const form = document.getElementById('formGrupo');
        const semestreSelect = document.getElementById('semestreGrupos');
        const grupoSemestreInput = document.getElementById('grupoSemestre');
        const docenteSelect = document.getElementById('grupoDocente');
        const materiaSelect = document.getElementById('grupoMateria');
        
        if (!modal || !form || !semestreSelect || !grupoSemestreInput || !docenteSelect || !materiaSelect) {
            console.error('❌ FALTAN ELEMENTOS EN EL DOM. Revisa el HTML del modal.');
            alert('Error: El modal de grupos no está correctamente configurado en el HTML. Revisa la consola.');
            return;
        }
        
        const semestre = semestreSelect.value;
        console.log('📅 Semestre seleccionado:', semestre);
        
        form.reset();
        grupoSemestreInput.value = semestre;
        
        console.log('📚 Cargando materias y docentes...');

        const materiasSemestre = await JefeController.obtenerMateriasPorSemestre(semestre);
        JefeController.materias = materiasSemestre;

        await JefeController.cargarDocentes();

        console.log(`📚 Materias del semestre ${semestre} cargadas:`, materiasSemestre.length);
        console.log('👨‍🏫 Docentes cargados:', JefeController.docentes.length);
        
        docenteSelect.innerHTML = '<option value="">Seleccione un docente...</option>';
        
        if (JefeController.docentes.length === 0) {
            console.warn('⚠️ No hay docentes disponibles');
            alert('⚠️ No hay docentes registrados. Por favor, agregue docentes primero en la pestaña "Docentes".');
            return;
        }
        
        JefeController.docentes.forEach(docente => {
            docenteSelect.innerHTML += `<option value="${docente.id}">${docente.nombre}</option>`;
        });
        
        console.log('✅ Select de docentes poblado con', JefeController.docentes.length, 'opciones');
        
        docenteSelect.onchange = (e) => {
            console.log('👨‍🏫 Docente seleccionado:', e.target.value);
            this.onDocenteSeleccionado(e.target.value);
        };
        
        materiaSelect.disabled = true;
        materiaSelect.innerHTML = '<option value="">Primero seleccione docente...</option>';

        if (grupoId) {
            console.log('📝 Modo edición - Cargando datos del grupo:', grupoId);
            document.getElementById('tituloModalGrupo').textContent = 'Editar Grupo';
            const grupo = JefeController.obtenerGrupoPorId(grupoId);
            
            if (grupo) {
                console.log('✅ Grupo encontrado:', grupo);
                document.getElementById('grupoId').value = grupo.id;
                document.getElementById('grupoNombre').value = grupo.nombre;
                document.getElementById('grupoDocente').value = grupo.docenteId;
                document.getElementById('grupoCantidadAlumnos').value = grupo.cantidadAlumnos;
                
                await this.onDocenteSeleccionado(grupo.docenteId, grupo.materiaId);
            } else {
                console.error('❌ No se encontró el grupo con ID:', grupoId);
            }
        } else {
            console.log('➕ Modo creación - Nuevo grupo');
            document.getElementById('tituloModalGrupo').textContent = 'Agregar Grupo';
            document.getElementById('grupoId').value = '';
        }

        console.log('🎨 Mostrando modal...');
        modal.classList.add('show');
        
        setTimeout(() => {
            const isVisible = modal.classList.contains('show');
            console.log(isVisible ? '✅ Modal visible' : '❌ Modal no visible');
        }, 100);
    }

    async onDocenteSeleccionado(docenteId, materiaSeleccionadaId = null) {
        console.log('📖 onDocenteSeleccionado llamado. Docente ID:', docenteId, 'Materia pre-seleccionada:', materiaSeleccionadaId);
        
        const materiaSelect = document.getElementById('grupoMateria');
        
        if (!docenteId) {
            materiaSelect.disabled = true;
            materiaSelect.innerHTML = '<option value="">Primero seleccione docente...</option>';
            this.limpiarVistaHorarioGrupo();
            return;
        }
        
        const semestre = document.getElementById('semestreGrupos').value;
        const todasLasMateriasDocente = JefeController.obtenerMateriasDocente(docenteId);
        const materiasDocente = todasLasMateriasDocente.filter(m => 
            m.semestre === parseInt(semestre)
        );
        
        console.log('📚 Materias del docente para semestre', semestre, ':', materiasDocente);
        
        if (materiasDocente.length === 0) {
            materiaSelect.disabled = true;
            materiaSelect.innerHTML = '<option value="">⚠️ Este docente no tiene materias en este semestre</option>';
            alert(`⚠️ Este docente no tiene materias asignadas para el semestre ${semestre}.\n\nPor favor, asigne materias del semestre ${semestre} al docente primero en la pestaña "Docentes".`);
            this.limpiarVistaHorarioGrupo();
            return;
        }
        
        materiaSelect.disabled = false;
        materiaSelect.innerHTML = '<option value="">Seleccione una materia...</option>';
        
        materiasDocente.forEach(materia => {
            const selected = materiaSeleccionadaId === materia.id ? 'selected' : '';
            materiaSelect.innerHTML += `<option value="${materia.id}" ${selected}>${materia.nombre}</option>`;
        });
        
        materiaSelect.onchange = () => {
            const materiaId = materiaSelect.value;
            if (materiaId) {
                this.mostrarHorarioEnModalGrupo(materiaId, semestre);
            } else {
                this.limpiarVistaHorarioGrupo();
            }
        };
        
        if (materiaSeleccionadaId) {
            this.mostrarHorarioEnModalGrupo(materiaSeleccionadaId, semestre);
        }
        
        console.log('✅ Select de materias actualizado con', materiasDocente.length, 'opciones del semestre', semestre);
    }

    cerrarModalGrupo() {
        document.getElementById('modalGrupo').classList.remove('show');
    }

    async guardarGrupo(e) {
        e.preventDefault();
        
        const id = document.getElementById('grupoId').value;
        const nombre = document.getElementById('grupoNombre').value;
        const semestre = document.getElementById('grupoSemestre').value;
        const materiaId = document.getElementById('grupoMateria').value;
        const docenteId = document.getElementById('grupoDocente').value;
        const cantidadAlumnos = document.getElementById('grupoCantidadAlumnos').value;

        console.log('💾 Guardando grupo:', { id, nombre, semestre, materiaId, docenteId, cantidadAlumnos });

        let resultado;
        if (id) {
            resultado = await JefeController.editarGrupo(id, { 
                nombre, 
                semestre, 
                materiaId, 
                docenteId, 
                cantidadAlumnos 
            });
            
            if (resultado.success) {
                this.cerrarModalGrupo();
                await this.cargarGrupos();
                alert('✅ Grupo actualizado correctamente');
            } else {
                alert('❌ Error al actualizar grupo');
            }
        } else {
            resultado = await JefeController.agregarGrupo(
                nombre, 
                semestre, 
                materiaId, 
                docenteId, 
                cantidadAlumnos
            );

            if (resultado.success) {
                this.cerrarModalGrupo();
                await this.cargarGrupos();
                alert(resultado.mensaje);
            } else if (resultado.insuficientes) {
                alert(resultado.mensaje);
            } else {
                alert('❌ Error al crear grupo');
            }
        }
    }

    editarGrupo(id) {
        this.abrirModalGrupo(id);
    }

    async eliminarGrupo(id) {
        if (confirm('¿Está seguro de eliminar este grupo?')) {
            const resultado = await JefeController.eliminarGrupo(id);
            if (resultado.success) {
                await this.cargarGrupos();
                alert('✅ Grupo eliminado correctamente');
            } else {
                alert('❌ Error al eliminar grupo');
            }
        }
    }

    async mostrarHorarioEnModalGrupo(materiaId, semestre) {
        console.log('📅 Mostrando horario para materia:', materiaId, 'semestre:', semestre);
        
        await JefeController.cargarHorariosPorSemestre(semestre);
        
        const horariosMateria = JefeController.horarios.filter(h => 
            h.materiaId === materiaId && h.semestre === parseInt(semestre)
        );
        
        console.log('📊 Horarios encontrados:', horariosMateria);
        
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        
        let contenedorHorario = document.getElementById('horarioGrupoContainer');
        if (!contenedorHorario) {
            contenedorHorario = document.createElement('div');
            contenedorHorario.id = 'horarioGrupoContainer';
            contenedorHorario.style.marginTop = '20px';
            contenedorHorario.style.padding = '15px';
            contenedorHorario.style.background = '#f5f5f5';
            contenedorHorario.style.borderRadius = '8px';
            
            const cantidadInput = document.getElementById('grupoCantidadAlumnos');
            cantidadInput.parentElement.parentElement.insertBefore(
                contenedorHorario, 
                cantidadInput.parentElement.nextSibling
            );
        }
        
        if (horariosMateria.length === 0) {
            contenedorHorario.innerHTML = `
                <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404;">
                    <strong>⚠️ Esta materia aún no tiene horarios asignados</strong>
                    <p style="margin: 10px 0 0 0; font-size: 0.9em;">
                        Por favor, asigne horarios en la pestaña "Horarios" primero.
                    </p>
                </div>
            `;
            return;
        }
        
        const horariosPorHora = {};
        horariosMateria.forEach(h => {
            if (!horariosPorHora[h.hora]) {
                horariosPorHora[h.hora] = [];
            }
            horariosPorHora[h.hora].push(h);
        });
        
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        
        let html = `
            <div style="margin-bottom: 10px;">
                <strong style="color: #9c27b0; font-size: 1.1em;">📅 Horario de ${materia.nombre}</strong>
            </div>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #9c27b0; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Hora</th>
                        ${dias.map(dia => `<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">${dia}</th>`).join('')}
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Aula</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const horasOrdenadas = Object.keys(horariosPorHora).sort();
        
        horasOrdenadas.forEach(hora => {
            const horariosDeHora = horariosPorHora[hora];
            const aula = horariosDeHora[0].aula || 'Sin asignar';
            
            html += `<tr>`;
            html += `<td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${hora}</td>`;
            
            dias.forEach(dia => {
                const tieneClase = horariosDeHora.some(h => h.dia === dia);
                if (tieneClase) {
                    html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; background: #4caf50; color: white; font-weight: bold;">✓</td>`;
                } else {
                    html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #ccc;">-</td>`;
                }
            });
            
            html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 500; color: #e65100;">🏫 ${aula}</td>`;
            html += `</tr>`;
        });
        
        html += `
                </tbody>
            </table>
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                <strong>Total de clases:</strong> ${horariosMateria.length} sesiones por semana
            </div>
        `;
        
        contenedorHorario.innerHTML = html;
    }

    limpiarVistaHorarioGrupo() {
        const contenedorHorario = document.getElementById('horarioGrupoContainer');
        if (contenedorHorario) {
            contenedorHorario.innerHTML = '';
        }
    }
}

const jefeView = new JefeView();
window.jefeView = jefeView;