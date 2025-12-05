import AuthController from '../controllers/AuthController.js';
import SubdirectorController from '../controllers/SubdirectorController.js';

class SubdirectorView {
    constructor() {
        this.init();
    }

    async init() {
        if (!AuthController.verificarRol('subdirector')) {
            return;
        }

        const usuario = AuthController.obtenerSesion();
        document.getElementById('userName').textContent = usuario.usuario;

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

        document.getElementById('btnAgregarUsuario').addEventListener('click', () => this.abrirModalUsuario());
        document.getElementById('closeModalUsuario').addEventListener('click', () => this.cerrarModalUsuario());
        document.getElementById('formUsuario').addEventListener('submit', (e) => this.guardarUsuario(e));
        document.getElementById('filtroRol').addEventListener('change', () => this.cargarUsuarios());
        document.getElementById('btnCargarHorario').addEventListener('click', () => this.cargarHorario());
        document.getElementById('closeModalDetalle').addEventListener('click', () => this.cerrarModalDetalle());
    }

    cambiarTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');

        switch(tabName) {
            case 'usuarios':
                this.cargarUsuarios();
                break;
            case 'materias':
                this.cargarMaterias();
                break;
            case 'docentes':
                this.cargarDocentes();
                break;
        }
    }

    async cargarDatos() {
        await this.cargarEstadisticas();
        await this.cargarUsuarios();
    }

    async cargarEstadisticas() {
        const stats = await SubdirectorController.obtenerEstadisticasGenerales();
        
        document.getElementById('totalMaterias').textContent = stats.totalMaterias;
        document.getElementById('totalDocentes').textContent = stats.totalDocentes;
        document.getElementById('totalHoras').textContent = stats.totalHorasAsignadas;
        document.getElementById('porcentajeOcupacion').textContent = stats.porcentajeOcupacion + '%';
    }

    // === USUARIOS ===
    async cargarUsuarios() {
        const filtro = document.getElementById('filtroRol').value;
        
        await SubdirectorController.cargarDocentes();
        await SubdirectorController.cargarUsuarios();

        if (filtro === 'docente') {
            this.renderizarDocentesParaUsuarios();
        } else {
            let usuarios;
            if (filtro) {
                usuarios = await SubdirectorController.obtenerUsuariosPorRol(filtro);
            } else {
                usuarios = SubdirectorController.usuarios;
            }
            this.renderizarUsuarios(usuarios);
        }
    }

    renderizarDocentesParaUsuarios() {
        const tbody = document.querySelector('#tablaUsuarios tbody');
        tbody.innerHTML = '';

        const docentes = SubdirectorController.docentes;
        const usuarios = SubdirectorController.usuarios;

        if (docentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay docentes registrados.</td></tr>';
            return;
        }

        docentes.forEach(docente => {
            const tr = document.createElement('tr');
            const usuarioVinculado = usuarios.find(u => u.docenteId === docente.id);
            
            if (usuarioVinculado) {
                tr.innerHTML = `
                    <td>${docente.nombre}</td>
                    <td><span style="color: var(--success); font-weight: 600;">✓ ${usuarioVinculado.usuario}</span></td>
                    <td><span style="text-transform: capitalize; color: var(--primary-purple); font-weight: 600;">${usuarioVinculado.rol}</span></td>
                    <td><span style="color: var(--success);">Activo</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="subdirectorView.editarUsuarioDocente('${usuarioVinculado.id}', '${docente.id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="subdirectorView.eliminarUsuarioDocente('${usuarioVinculado.id}')">Eliminar</button>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${docente.nombre}</td>
                    <td><span style="color: var(--warning);">⚠️ Sin acceso</span></td>
                    <td>-</td>
                    <td>-</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="subdirectorView.crearUsuarioParaDocente('${docente.id}', '${docente.nombre}')">
                            ➕ Crear Usuario
                        </button>
                    </td>
                `;
            }
            
            tbody.appendChild(tr);
        });
    }

    renderizarUsuarios(usuarios) {
        const tbody = document.querySelector('#tablaUsuarios tbody');
        tbody.innerHTML = '';

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay usuarios registrados</td></tr>';
            return;
        }

        usuarios.forEach(usuario => {
            const tr = document.createElement('tr');
            const estado = usuario.activo ? 'Activo' : 'Inactivo';
            const estadoColor = usuario.activo ? 'var(--success)' : 'var(--danger)';
            
            // Nombre a mostrar
            let nombreMostrar = usuario.usuario;
            if (usuario.docenteId) {
                const docente = SubdirectorController.docentes.find(d => d.id === usuario.docenteId);
                if (docente) {
                    nombreMostrar = docente.nombre;
                }
            }
            
            tr.innerHTML = `
                <td>${nombreMostrar}</td>
                <td>${usuario.usuario}</td>
                <td><span style="text-transform: capitalize; color: var(--primary-purple); font-weight: 600;">${usuario.rol || 'N/A'}</span></td>
                <td><span style="color: ${estadoColor}; font-weight: 600;">${estado}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="subdirectorView.editarUsuario('${usuario.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="subdirectorView.eliminarUsuario('${usuario.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    crearUsuarioParaDocente(docenteId, nombreDocente) {
        const modal = document.getElementById('modalUsuario');
        const form = document.getElementById('formUsuario');
        form.reset();

        document.getElementById('tituloModalUsuario').textContent = `Crear Usuario para: ${nombreDocente}`;
        document.getElementById('usuarioId').value = '';
        document.getElementById('docenteIdHidden').value = docenteId;
        document.getElementById('nombreDocenteDisplay').textContent = nombreDocente;
        document.getElementById('infoDocente').style.display = 'block';
        
        // Pre-seleccionar rol docente
        document.getElementById('usuarioRol').value = 'docente';

        modal.classList.add('show');
    }

    editarUsuarioDocente(usuarioId, docenteId) {
        const modal = document.getElementById('modalUsuario');
        const form = document.getElementById('formUsuario');
        form.reset();

        const usuario = SubdirectorController.usuarios.find(u => u.id === usuarioId);
        const docente = SubdirectorController.docentes.find(d => d.id === docenteId);

        document.getElementById('tituloModalUsuario').textContent = `Editar Usuario: ${docente.nombre}`;
        document.getElementById('usuarioId').value = usuario.id;
        document.getElementById('docenteIdHidden').value = docenteId;
        document.getElementById('usuarioNombre').value = usuario.usuario;
        document.getElementById('usuarioPassword').value = usuario.password;
        document.getElementById('usuarioRol').value = usuario.rol || 'docente';
        document.getElementById('nombreDocenteDisplay').textContent = docente.nombre;
        document.getElementById('infoDocente').style.display = 'block';

        modal.classList.add('show');
    }

    async eliminarUsuarioDocente(usuarioId) {
        if (confirm('¿Está seguro de eliminar el acceso de este usuario?')) {
            const resultado = await SubdirectorController.eliminarUsuario(usuarioId);
            if (resultado.success) {
                await this.cargarUsuarios();
                await this.cargarEstadisticas();
                alert('✅ Usuario eliminado correctamente');
            } else {
                alert('❌ Error: ' + (resultado.mensaje || 'No se pudo eliminar'));
            }
        }
    }

    abrirModalUsuario(usuarioId = null) {
        const modal = document.getElementById('modalUsuario');
        const form = document.getElementById('formUsuario');
        form.reset();
        
        document.getElementById('infoDocente').style.display = 'none';
        document.getElementById('docenteIdHidden').value = '';

        if (usuarioId) {
            document.getElementById('tituloModalUsuario').textContent = 'Editar Usuario';
            const usuario = SubdirectorController.usuarios.find(u => u.id === usuarioId);
            
            document.getElementById('usuarioId').value = usuario.id;
            document.getElementById('usuarioNombre').value = usuario.usuario;
            document.getElementById('usuarioPassword').value = usuario.password;
            document.getElementById('usuarioRol').value = usuario.rol || '';
        } else {
            document.getElementById('tituloModalUsuario').textContent = 'Crear Usuario';
            document.getElementById('usuarioId').value = '';
        }

        modal.classList.add('show');
    }

    cerrarModalUsuario() {
        document.getElementById('modalUsuario').classList.remove('show');
    }

    async guardarUsuario(e) {
        e.preventDefault();
        
        const id = document.getElementById('usuarioId').value;
        const usuario = document.getElementById('usuarioNombre').value;
        const password = document.getElementById('usuarioPassword').value;
        const rol = document.getElementById('usuarioRol').value;
        const docenteId = document.getElementById('docenteIdHidden').value;
        
        console.log('💾 Guardando usuario:', { id, usuario, rol, docenteId }); // DEBUG
        
        if (!rol) {
            alert('❌ Por favor seleccione un rol');
            return;
        }
        
        let resultado;
        
        if (id) {
            // Editar
            const datos = { usuario, password, rol };
            if (docenteId) {
                datos.docenteId = docenteId;
            }
            resultado = await SubdirectorController.editarUsuario(id, datos);
        } else {
            // Crear nuevo
            resultado = await SubdirectorController.crearUsuario(
                usuario, 
                password, 
                rol, 
                docenteId || null
            );
        }

        if (resultado.success) {
            this.cerrarModalUsuario();
            await this.cargarUsuarios();
            await this.cargarEstadisticas();
            alert(id ? '✅ Usuario actualizado' : '✅ Usuario creado con rol: ' + rol);
        } else {
            alert('❌ Error: ' + (resultado.mensaje || 'No se pudo guardar'));
        }
    }

    editarUsuario(id) {
        this.abrirModalUsuario(id);
    }

    async eliminarUsuario(id) {
        if (confirm('¿Está seguro de eliminar este usuario?')) {
            const resultado = await SubdirectorController.eliminarUsuario(id);
            if (resultado.success) {
                await this.cargarUsuarios();
                await this.cargarEstadisticas();
                alert('✅ Usuario eliminado');
            } else {
                alert('❌ Error al eliminar');
            }
        }
    }

    // === MATERIAS ===
    async cargarMaterias() {
        await SubdirectorController.cargarMaterias();
        const materiasPorSemestre = SubdirectorController.obtenerMateriasPorSemestre();
        this.renderizarMaterias(materiasPorSemestre);
    }

    renderizarMaterias(materiasPorSemestre) {
        const container = document.getElementById('materiasPorSemestre');
        let html = '';

        for (let semestre = 1; semestre <= 9; semestre++) {
            const materias = materiasPorSemestre[semestre] || [];
            
            html += `
                <div class="card" style="margin-bottom: 20px;">
                    <h3 style="color: var(--primary-purple); margin-bottom: 15px;">Semestre ${semestre}</h3>
                    ${materias.length > 0 ? `
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Materia</th>
                                    <th>Créditos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${materias.map(m => `
                                    <tr>
                                        <td>${m.nombre}</td>
                                        <td>${m.creditos}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="color: var(--text-light);">No hay materias</p>'}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // === DOCENTES ===
    async cargarDocentes() {
        await SubdirectorController.cargarDocentes();
        await SubdirectorController.cargarTodosLosHorarios();
        await SubdirectorController.cargarMaterias();
        await SubdirectorController.cargarUsuarios();
        
        const docentes = SubdirectorController.docentes;
        const docentesConDetalles = [];

        for (const docente of docentes) {
            const detalle = await SubdirectorController.obtenerDocenteConDetalles(docente.id);
            const usuarioVinculado = SubdirectorController.usuarios.find(u => u.docenteId === docente.id);
            
            detalle.tieneUsuario = !!usuarioVinculado;
            detalle.usuarioId = usuarioVinculado?.id || null;
            detalle.nombreUsuario = usuarioVinculado?.usuario || null;
            
            docentesConDetalles.push(detalle);
        }

        this.renderizarDocentes(docentesConDetalles);
    }

    renderizarDocentes(docentes) {
        const tbody = document.querySelector('#tablaDocentes tbody');
        tbody.innerHTML = '';

        if (docentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay docentes</td></tr>';
            return;
        }

        docentes.forEach(docente => {
            const tr = document.createElement('tr');
            
            let estadoUsuario, accionUsuario;
            if (docente.tieneUsuario) {
                estadoUsuario = `<span style="color: var(--success); font-weight: 600;">✓ ${docente.nombreUsuario}</span>`;
                accionUsuario = `
                    <button class="btn btn-secondary btn-sm" onclick="subdirectorView.editarUsuarioDocente('${docente.usuarioId}', '${docente.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="subdirectorView.eliminarUsuarioDocente('${docente.usuarioId}')">🗑️ Eliminar</button>
                `;
            } else {
                estadoUsuario = '<span style="color: var(--warning);">⚠️ Sin acceso</span>';
                accionUsuario = `
                    <button class="btn btn-primary btn-sm" onclick="subdirectorView.crearUsuarioParaDocente('${docente.id}', '${docente.nombre}')">➕ Crear Usuario</button>
                `;
            }
            
            tr.innerHTML = `
                <td>${docente.nombre}</td>
                <td>${estadoUsuario}</td>
                <td>${docente.horasSemanales}</td>
                <td>${docente.horasOcupadas}</td>
                <td>${docente.horasLibres}</td>
                <td>${docente.materiasDetalle?.length || 0}</td>
                <td>
                    ${accionUsuario}
                    <button class="btn btn-info btn-sm" onclick="subdirectorView.verDetalleDocente('${docente.id}')">👁️ Ver</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async verDetalleDocente(docenteId) {
        const detalle = await SubdirectorController.obtenerDocenteConDetalles(docenteId);
        const usuarioVinculado = SubdirectorController.usuarios.find(u => u.docenteId === docenteId);
        
        let html = `
            <div style="padding: 20px;">
                <h3 style="color: var(--primary-purple); margin-bottom: 20px;">${detalle.nombre}</h3>
                
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>Usuario:</strong> ${
                        usuarioVinculado 
                            ? `<span style="color: var(--success);">✓ ${usuarioVinculado.usuario} (${usuarioVinculado.rol})</span>`
                            : '<span style="color: var(--warning);">⚠️ Sin usuario</span>'
                    }</p>
                    <p><strong>Horas Disponibles:</strong> ${detalle.horasSemanales}</p>
                    <p><strong>Horas Ocupadas:</strong> ${detalle.horasOcupadas}</p>
                    <p><strong>Horas Libres:</strong> ${detalle.horasLibres}</p>
                </div>

                <h4 style="color: var(--dark-purple);">Materias:</h4>
                ${detalle.materiasDetalle?.length > 0 ? `
                    <ul>${detalle.materiasDetalle.map(m => `<li>${m.nombre} - Sem ${m.semestre}</li>`).join('')}</ul>
                ` : '<p style="color: var(--text-light);">Sin materias</p>'}
            </div>
        `;

        document.getElementById('contenidoDetalle').innerHTML = html;
        document.getElementById('modalDetalleDocente').classList.add('show');
    }

    cerrarModalDetalle() {
        document.getElementById('modalDetalleDocente').classList.remove('show');
    }

    async cargarHorario() {
        const semestre = document.getElementById('semestreHorario').value;
        await SubdirectorController.cargarMaterias();
        await SubdirectorController.cargarDocentes();
        
        const matriz = await SubdirectorController.generarMatrizHorarioPorSemestre(semestre);
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
                html += celda ? `
                    <div class="schedule-cell occupied">
                        <strong>${celda.materia}</strong>
                        <small>${celda.docente}</small>
                        <small>Aula: ${celda.aula}</small>
                    </div>
                ` : `<div class="schedule-cell">Libre</div>`;
            });
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

const subdirectorView = new SubdirectorView();
window.subdirectorView = subdirectorView;