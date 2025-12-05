import { db } from '../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc,
    updateDoc, 
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

class Docente {
    constructor() {
        this.collectionName = 'docentes';
    }

    async crear(nombre, horasSemanales, usuarioId = null) {
        try {
            const docenteData = {
                nombre,
                horasSemanales: parseInt(horasSemanales),
                materias: [],
                horarioDisponible: {},
                fechaCreacion: new Date().toISOString()
            };

            if (usuarioId) {
                docenteData.usuarioId = usuarioId;
            }

            const docRef = await addDoc(collection(db, this.collectionName), docenteData);
            console.log('✅ Docente creado:', docRef.id);
            return { id: docRef.id, success: true };
        } catch (error) {
            console.error('❌ Error al crear docente:', error);
            return { success: false, error };
        }
    }

    async obtenerTodos() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const docentes = [];
            querySnapshot.forEach((doc) => {
                docentes.push({ id: doc.id, ...doc.data() });
            });
            return docentes;
        } catch (error) {
            console.error('❌ Error al obtener docentes:', error);
            return [];
        }
    }

    async obtenerPorId(id) {
        try {
            console.log('🔍 Buscando docente por ID:', id);
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const docente = { id: docSnap.id, ...docSnap.data() };
                console.log('✅ Docente encontrado:', docente);
                return docente;
            } else {
                console.log('❌ Docente no encontrado con ID:', id);
                return null;
            }
        } catch (error) {
            console.error('❌ Error al obtener docente por ID:', error);
            return null;
        }
    }

    async obtenerPorUsuarioId(usuarioId) {
        try {
            console.log('🔍 Buscando docente por usuarioId:', usuarioId);
            const q = query(
                collection(db, this.collectionName),
                where('usuarioId', '==', usuarioId)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docente = { 
                    id: querySnapshot.docs[0].id, 
                    ...querySnapshot.docs[0].data() 
                };
                console.log('✅ Docente encontrado por usuarioId:', docente);
                return docente;
            }
            
            console.log('❌ No se encontró docente con usuarioId:', usuarioId);
            return null;
        } catch (error) {
            console.error('❌ Error al buscar docente por usuarioId:', error);
            return null;
        }
    }

    async actualizar(id, datos) {
        try {
            console.log('💾 Actualizando docente:', id, datos);
            const docenteRef = doc(db, this.collectionName, id);
            
            // Si hay horasSemanales, convertir a número
            if (datos.horasSemanales) {
                datos.horasSemanales = parseInt(datos.horasSemanales);
            }
            
            await updateDoc(docenteRef, datos);
            console.log('✅ Docente actualizado correctamente');
            return { success: true };
        } catch (error) {
            console.error('❌ Error al actualizar docente:', error);
            return { success: false, error, mensaje: error.message };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            console.log('✅ Docente eliminado:', id);
            return { success: true };
        } catch (error) {
            console.error('❌ Error al eliminar docente:', error);
            return { success: false, error };
        }
    }

    async asignarMateria(docenteId, materiaId) {
        try {
            const docente = await this.obtenerPorId(docenteId);
            if (!docente) {
                return { success: false, mensaje: 'Docente no encontrado' };
            }

            const materias = docente.materias || [];
            
            if (materias.includes(materiaId)) {
                return { success: false, mensaje: 'La materia ya está asignada' };
            }

            materias.push(materiaId);
            await this.actualizar(docenteId, { materias });
            
            console.log('✅ Materia asignada al docente');
            return { success: true };
        } catch (error) {
            console.error('❌ Error al asignar materia:', error);
            return { success: false, error };
        }
    }

    async removerMateria(docenteId, materiaId) {
        try {
            const docente = await this.obtenerPorId(docenteId);
            if (!docente) {
                return { success: false, mensaje: 'Docente no encontrado' };
            }

            const materias = (docente.materias || []).filter(id => id !== materiaId);
            await this.actualizar(docenteId, { materias });
            
            console.log('✅ Materia removida del docente');
            return { success: true };
        } catch (error) {
            console.error('❌ Error al remover materia:', error);
            return { success: false, error };
        }
    }
}

export default new Docente();