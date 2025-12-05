import AuthController from '../controllers/AuthController.js';
import DocenteController from '../controllers/DocenteController.js';

class DocenteView {
    constructor() {
        this.materiasSeleccionadas = new Set();
        this.horarioDisponible = {};
        this.init();
    }

    async init() {
        if (!AuthController.verificarRol('docente')) {
            return;
        }

        const usuario = AuthController.obtenerSesion();
        document.getElementById('userName').textContent = usuario.usuario;

        const inicializado = await DocenteController.inicializar();
        
        if (!inicializado) {
            alert('No se encontró información del docente. Contacte al administrador.');
            return;
        }

        this.setupEventListeners();
        await this.cargarDatos();
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            AuthController.logout();
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.cambiarTab(e.target.dataset.tab));
        });

        document.getElementById('btnGuardarMaterias').addEventListener('click', () => this.guardarMateriasSeleccionadas());
        document.getElementById('btnGuardarHorario').addEventListener('click', () => this.guardarHorarioDisponible());
    }

    async cambiarTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');

        if (tabName === 'configuracion') {
            console.log('🔧 Cargando configuración...');
            await this.cargarConfiguracion();
        }
    }

    async cargarDatos() {
        await this.cargarEstadisticas();
        await this.cargarHorario();
        await this.cargarMaterias();
    }

    async cargarEstadisticas() {
        const stats = DocenteController.obtenerEstadisticas();
        
        document.getElementById('horasOcupadas').textContent = stats.horasOcupadas;
        document.getElementById('horasLibres').textContent = stats.horasLibres;
        document.getElementById('materiasAsignadas').textContent = stats.materiasAsignadas;
        document.getElementById('porcentajeOcupacion').textContent = stats.porcentajeOcupacion + '%';
    }

    async cargarHorario() {
        const matriz = DocenteController.generarMatrizHorario();
        this.renderizarHorario(matriz);
    }

    renderizarHorario(matriz) {
    const container = document.getElementById('horarioContainer');
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    
    let html = `
        <div class="schedule-grid">
            <div class="schedule-header">Hora</div>
            ${dias.map(dia => `<div class="schedule-header">${dia}</div>`).join('')}
    `;

    Object.keys(matriz).forEach(hora => {
        html += `<div class="schedule-time">${hora}</div>`;
        
        dias.forEach(dia => {
            const celda = matriz[hora][dia];
            
            if (celda) {
                html += `
                    <div class="schedule-cell occupied">
                        <strong style="font-size: 1em; display: block; margin-bottom: 5px;">${celda.materia}</strong>
                        <small style="display: block; margin-bottom: 3px;">📚 Semestre ${celda.semestre}</small>
                        <small style="display: block; margin-bottom: 3px;">🏫 Aula: ${celda.aula}</small>
                        ${celda.grupo ? `
                            <small style="display: block; margin-bottom: 3px; color: #9c27b0; font-weight: 600;">👥 Grupo: ${celda.grupo}</small>
                        ` : ''}
                        ${celda.cantidadAlumnos ? `
                            <small style="display: block; background: #2196f3; color: white; padding: 2px 6px; border-radius: 10px; display: inline-block; margin-top: 3px;">
                                👨‍🎓 ${celda.cantidadAlumnos} alumnos
                            </small>
                        ` : ''}
                    </div>
                `;
            } else {
                html += `<div class="schedule-cell">Libre</div>`;
            }
        });
    });

    html += '</div>';
    container.innerHTML = html;
}

    async cargarMaterias() {
        const materias = DocenteController.materiasAsignadas;
        this.renderizarMaterias(materias);
    }

    renderizarMaterias(materias) {
        const tbody = document.querySelector('#tablaMaterias tbody');
        tbody.innerHTML = '';

        if (materias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No tienes materias asignadas aún. Ve a "Configuración" para seleccionar las materias que puedes impartir.</td></tr>';
            return;
        }

        materias.forEach(materia => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${materia.nombre}</td>
                <td>${materia.creditos}</td>
                <td>Semestre ${materia.semestre}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // === CONFIGURACIÓN ===
    async cargarConfiguracion() {
        await this.cargarMateriasDisponibles();
        await this.cargarHorarioDisponibleConfig();
    }

    async cargarMateriasDisponibles() {
        const container = document.getElementById('materiasDisponiblesContainer');
        
        console.log('📚 Cargando materias disponibles...');
        const todasLasMaterias = await DocenteController.cargarMateriasDisponibles();
        console.log('📚 Total materias cargadas:', todasLasMaterias.length);
        
        if (todasLasMaterias.length === 0) {
            container.innerHTML = `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <p style="color: #856404; margin: 0;">
                        ⚠️ <strong>No hay materias disponibles.</strong><br>
                        Por favor, contacta al Jefe de Departamento para que agregue materias al sistema.
                    </p>
                </div>
            `;
            return;
        }
        
        // Obtener materias ya asignadas al docente
        const materiasAsignadas = DocenteController.docenteActual?.materias || [];
        this.materiasSeleccionadas = new Set(materiasAsignadas);
        console.log('✅ Materias ya asignadas al docente:', materiasAsignadas);

        // Agrupar por semestre
        const materiasPorSemestre = {};
        for (let i = 1; i <= 9; i++) {
            materiasPorSemestre[i] = todasLasMaterias.filter(m => m.semestre === i);
        }

        let html = '<div class="materias-grid">';

        for (let semestre = 1; semestre <= 9; semestre++) {
            const materias = materiasPorSemestre[semestre];
            
            if (materias.length > 0) {
                html += `
                    <div class="semestre-card">
                        <h4>📖 Semestre ${semestre}</h4>
                `;

                materias.forEach(materia => {
                    const checked = this.materiasSeleccionadas.has(materia.id) ? 'checked' : '';
                    html += `
                        <div class="materia-checkbox">
                            <input 
                                type="checkbox" 
                                id="materia_${materia.id}" 
                                value="${materia.id}"
                                ${checked}
                                onchange="docenteView.toggleMateria('${materia.id}', this.checked)"
                            >
                            <label for="materia_${materia.id}">
                                ${materia.nombre}
                                <span class="creditos-badge">${materia.creditos} créd.</span>
                            </label>
                        </div>
                    `;
                });

                html += '</div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
        console.log('✅ Materias renderizadas en pantalla');
    }

    toggleMateria(materiaId, checked) {
        if (checked) {
            this.materiasSeleccionadas.add(materiaId);
        } else {
            this.materiasSeleccionadas.delete(materiaId);
        }
        console.log('Materias seleccionadas:', Array.from(this.materiasSeleccionadas));
    }

    async guardarMateriasSeleccionadas() {
        const materiasArray = Array.from(this.materiasSeleccionadas);
        
        if (materiasArray.length === 0) {
            alert('⚠️ Por favor selecciona al menos una materia');
            return;
        }

        console.log('💾 Guardando materias:', materiasArray);

        const resultado = await DocenteController.actualizarMaterias(materiasArray);

        if (resultado.success) {
            alert(`✅ Se guardaron ${materiasArray.length} materias correctamente`);
            await this.cargarDatos();
        } else {
            alert('❌ Error al guardar las materias: ' + (resultado.mensaje || 'Error desconocido'));
        }
    }

    async cargarHorarioDisponibleConfig() {
        const container = document.getElementById('horarioDisponibleContainer');
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];

        // Cargar horario disponible guardado
        const horarioGuardado = DocenteController.docenteActual.horarioDisponible || {};
        this.horarioDisponible = horarioGuardado;

        let html = '<div class="horario-config-grid">';

        dias.forEach(dia => {
            html += `
                <div class="dia-config">
                    <h4>${dia}</h4>
            `;

            horas.forEach(hora => {
                const key = `${dia}_${hora}`;
                const checked = this.horarioDisponible[key] ? 'checked' : '';
                
                html += `
                    <div class="hora-checkbox">
                        <input 
                            type="checkbox" 
                            id="hora_${key}" 
                            value="${key}"
                            ${checked}
                            onchange="docenteView.toggleHorario('${key}', this.checked)"
                        >
                        <label for="hora_${key}">${hora}</label>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
    }

    toggleHorario(key, checked) {
        if (checked) {
            this.horarioDisponible[key] = true;
        } else {
            delete this.horarioDisponible[key];
        }
        console.log('Horario disponible:', this.horarioDisponible);
    }

    async guardarHorarioDisponible() {
        const horasSeleccionadas = Object.keys(this.horarioDisponible).length;
        
        if (horasSeleccionadas === 0) {
            alert('⚠️ Por favor selecciona al menos una hora disponible');
            return;
        }

        console.log('💾 Guardando horario disponible:', this.horarioDisponible);

        const resultado = await DocenteController.actualizarHorarioDisponible(this.horarioDisponible);

        if (resultado.success) {
            alert(`✅ Se guardó tu horario disponible (${horasSeleccionadas} horas)`);
        } else {
            alert('❌ Error al guardar el horario: ' + (resultado.mensaje || 'Error desconocido'));
        }
    }
}

const docenteView = new DocenteView();
window.docenteView = docenteView;