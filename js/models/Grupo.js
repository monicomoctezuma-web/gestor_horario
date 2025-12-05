import { db } from '../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

class Grupo {
    constructor() {
        this.collectionName = 'grupos';
    }

    /**
     * Crear uno o más grupos automáticamente según cantidad de alumnos
     */
    async crear(nombre, semestre, materiaId, docenteId, cantidadAlumnos) {
        try {
            const cantidad = parseInt(cantidadAlumnos);

            // Validar mínimo de alumnos
            if (cantidad < 10) {
                return { 
                    success: false, 
                    mensaje: '⚠️ No hay alumnos suficientes. Se requieren mínimo 10 alumnos para abrir un grupo.',
                    insuficientes: true
                };
            }

            // Calcular cuántos grupos se necesitan (máximo 30 por grupo)
            const numGrupos = Math.ceil(cantidad / 30);
            const alumnosPorGrupo = Math.ceil(cantidad / numGrupos);
            
            const gruposCreados = [];

            // Crear los grupos necesarios
            for (let i = 0; i < numGrupos; i++) {
                const nombreGrupo = numGrupos > 1 ? `${nombre} ${i + 1}` : nombre;
                
                // Calcular alumnos para este grupo específico
                const alumnosRestantes = cantidad - (i * alumnosPorGrupo);
                const alumnosEsteGrupo = Math.min(alumnosPorGrupo, alumnosRestantes);

                const docRef = await addDoc(collection(db, this.collectionName), {
                    nombre: nombreGrupo,
                    semestre: parseInt(semestre),
                    materiaId,
                    docenteId,
                    cantidadAlumnos: alumnosEsteGrupo,
                    fechaCreacion: new Date().toISOString()
                });

                gruposCreados.push({
                    id: docRef.id,
                    nombre: nombreGrupo,
                    alumnos: alumnosEsteGrupo
                });
            }

            // Mensaje de éxito
            let mensaje = '';
            if (numGrupos === 1) {
                mensaje = `✅ Grupo creado exitosamente con ${cantidad} alumnos`;
            } else {
                const detalles = gruposCreados.map(g => 
                    `${g.nombre} (${g.alumnos} alumnos)`
                ).join('\n');
                mensaje = `✅ Se crearon ${numGrupos} grupos automáticamente:\n\n${detalles}`;
            }

            return { 
                success: true, 
                mensaje,
                grupos: gruposCreados,
                multipleGrupos: numGrupos > 1
            };
        } catch (error) {
            console.error('Error al crear grupo:', error);
            return { success: false, error, mensaje: 'Error al crear el grupo' };
        }
    }

    async obtenerTodos() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const grupos = [];
            querySnapshot.forEach((doc) => {
                grupos.push({ id: doc.id, ...doc.data() });
            });
            
            return grupos.sort((a, b) => {
                if (a.semestre !== b.semestre) {
                    return a.semestre - b.semestre;
                }
                return a.nombre.localeCompare(b.nombre);
            });
        } catch (error) {
            console.error('Error al obtener grupos:', error);
            return [];
        }
    }

    async obtenerPorSemestre(semestre) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('semestre', '==', parseInt(semestre))
            );
            const querySnapshot = await getDocs(q);
            const grupos = [];
            querySnapshot.forEach((doc) => {
                grupos.push({ id: doc.id, ...doc.data() });
            });
            
            return grupos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        } catch (error) {
            console.error('Error al obtener grupos por semestre:', error);
            return [];
        }
    }

    // === AGREGAR ESTE MÉTODO AL ARCHIVO models/Grupo.js ===
// Colócalo después del método obtenerPorSemestre

async obtenerPorDocente(docenteId) {
    try {
        console.log('🔍 Buscando grupos del docente:', docenteId);
        const q = query(
            collection(db, this.collectionName),
            where('docenteId', '==', docenteId)
        );
        const querySnapshot = await getDocs(q);
        
        const grupos = [];
        querySnapshot.forEach((doc) => {
            grupos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('✅ Grupos encontrados:', grupos.length);
        return grupos;
    } catch (error) {
        console.error('❌ Error al obtener grupos por docente:', error);
        return [];
    }
}

    async actualizar(id, datos) {
        try {
            const grupoRef = doc(db, this.collectionName, id);
            const updateData = {
                ...datos,
                semestre: parseInt(datos.semestre),
                cantidadAlumnos: parseInt(datos.cantidadAlumnos)
            };
            await updateDoc(grupoRef, updateData);
            return { success: true };
        } catch (error) {
            console.error('Error al actualizar grupo:', error);
            return { success: false, error };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar grupo:', error);
            return { success: false, error };
        }
    }
}

export default new Grupo();