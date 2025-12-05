import { db } from '../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

class Horario {
    constructor() {
        this.collectionName = 'horarios';
        this.diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        this.horas = [
            '7:00-8:00',
            '8:00-9:00',
            '9:00-10:00',
            '10:00-11:00',
            '11:00-12:00',
            '12:00-13:00',
            '13:00-14:00',
            '14:00-15:00',
            '15:00-16:00',
            '16:00-17:00'
        ];
    }

    async crear(semestre, dia, hora, materiaId, docenteId, aula) {
        try {
            console.log('📝 Horario.crear llamado:', { semestre, dia, hora, materiaId, docenteId, aula });
            
            const disponibilidad = await this.verificarDisponibilidad(
                semestre, dia, hora, docenteId, aula
            );
            
            if (!disponibilidad.disponible) {
                console.error('❌ No disponible:', disponibilidad.mensaje);
                return {
                    success: false,
                    mensaje: disponibilidad.mensaje
                };
            }
            
            const docRef = await addDoc(collection(db, this.collectionName), {
                semestre: parseInt(semestre),
                dia,
                hora,
                materiaId,
                docenteId,
                aula,
                fechaCreacion: new Date().toISOString()
            });
            
            console.log(`✅ Horario creado: ${dia} - ${hora}`);
            
            return { 
                id: docRef.id, 
                success: true,
                mensaje: `Horario creado para ${dia}`
            };
            
        } catch (error) {
            console.error('❌ Error al crear horario:', error);
            return { 
                success: false, 
                error,
                mensaje: `Error al crear horario: ${error.message}`
            };
        }
    }

    async crearMultiple(semestre, dias, hora, materiaId, docenteId, aula) {
        console.log('📦 Horario.crearMultiple llamado:', { semestre, dias, hora, materiaId, docenteId, aula });
        
        const resultados = [];
        const idsCreados = [];
        
        try {
            for (const dia of dias) {
                const resultado = await this.crear(semestre, dia, hora, materiaId, docenteId, aula);
                
                resultados.push({ dia, resultado });
                
                if (resultado.success) {
                    idsCreados.push(resultado.id);
                    console.log(`  ✅ ${dia} creado (ID: ${resultado.id})`);
                } else {
                    console.error(`  ❌ Error en ${dia}:`, resultado.mensaje);
                    
                    console.warn('🔄 Revirtiendo horarios creados...');
                    for (const id of idsCreados) {
                        await this.eliminar(id);
                        console.log(`    🗑️ Horario ${id} eliminado`);
                    }
                    
                    return {
                        success: false,
                        mensaje: `Error al crear horario para ${dia}: ${resultado.mensaje}`
                    };
                }
            }
            
            console.log(`✅ Todos los horarios creados exitosamente (${dias.length} días)`);
            return {
                success: true,
                mensaje: `${dias.length} horarios creados exitosamente`,
                diasCreados: dias,
                idsCreados: idsCreados
            };
            
        } catch (error) {
            console.error('❌ Error crítico en crearMultiple:', error);
            
            for (const id of idsCreados) {
                try {
                    await this.eliminar(id);
                } catch (e) {
                    console.error('Error al limpiar:', e);
                }
            }
            
            return {
                success: false,
                mensaje: `Error crítico: ${error.message}`
            };
        }
    }

    async obtenerPorSemestre(semestre) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('semestre', '==', parseInt(semestre))
            );
            const querySnapshot = await getDocs(q);
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener horarios:', error);
            return [];
        }
    }

    async obtenerPorDocente(docenteId) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('docenteId', '==', docenteId)
            );
            const querySnapshot = await getDocs(q);
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener horarios por docente:', error);
            return [];
        }
    }

    async verificarDisponibilidad(semestre, dia, hora, docenteId = null, aula = null) {
        try {
            if (aula) {
                const qAula = query(
                    collection(db, this.collectionName),
                    where('semestre', '==', parseInt(semestre)),
                    where('dia', '==', dia),
                    where('hora', '==', hora),
                    where('aula', '==', aula)
                );
                const aulaSnapshot = await getDocs(qAula);
                if (!aulaSnapshot.empty) {
                    return { 
                        disponible: false, 
                        mensaje: `Aula ${aula} ocupada el ${dia} a las ${hora}` 
                    };
                }
            }

            if (docenteId) {
                const qDocente = query(
                    collection(db, this.collectionName),
                    where('dia', '==', dia),
                    where('hora', '==', hora),
                    where('docenteId', '==', docenteId)
                );
                const docenteSnapshot = await getDocs(qDocente);
                if (!docenteSnapshot.empty) {
                    return { 
                        disponible: false, 
                        mensaje: `Docente ocupado el ${dia} a las ${hora}` 
                    };
                }
            }

            return { disponible: true };
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return { disponible: false, error };
        }
    }

    async actualizar(id, datos) {
        try {
            const horarioRef = doc(db, this.collectionName, id);
            const updateData = {
                ...datos,
                semestre: datos.semestre ? parseInt(datos.semestre) : undefined
            };
            await updateDoc(horarioRef, updateData);
            return { success: true };
        } catch (error) {
            console.error('Error al actualizar horario:', error);
            return { success: false, error };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar horario:', error);
            return { success: false, error };
        }
    }

    async eliminarPorMateriaHora(semestre, hora, materiaId) {
        try {
            console.log('🗑️ Eliminando horarios:', { semestre, hora, materiaId });
            
            const q = query(
                collection(db, this.collectionName),
                where('semestre', '==', parseInt(semestre)),
                where('hora', '==', hora),
                where('materiaId', '==', materiaId)
            );
            
            const querySnapshot = await getDocs(q);
            const eliminaciones = [];
            
            for (const docSnap of querySnapshot.docs) {
                await deleteDoc(doc(db, this.collectionName, docSnap.id));
                eliminaciones.push(docSnap.id);
                console.log(`  ✅ Horario ${docSnap.id} eliminado`);
            }
            
            console.log(`✅ Total eliminados: ${eliminaciones.length}`);
            
            return { 
                success: true, 
                eliminados: eliminaciones.length 
            };
        } catch (error) {
            console.error('Error al eliminar horarios:', error);
            return { success: false, error };
        }
    }

    async obtenerTodos() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener todos los horarios:', error);
            return [];
        }
    }
}

export default new Horario();