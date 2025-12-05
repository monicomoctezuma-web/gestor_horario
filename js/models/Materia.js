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

class Materia {
    constructor() {
        this.collectionName = 'materias';
    }

    async crear(nombre, creditos, semestre) {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                nombre,
                creditos: parseInt(creditos),
                semestre: parseInt(semestre),
                fechaCreacion: new Date().toISOString()
            });
            return { id: docRef.id, success: true };
        } catch (error) {
            console.error('Error al crear materia:', error);
            return { success: false, error };
        }
    }

    async obtenerTodas() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const materias = [];
            querySnapshot.forEach((doc) => {
                materias.push({ id: doc.id, ...doc.data() });
            });
            
            // Ordenar en JavaScript en lugar de Firestore
            return materias.sort((a, b) => {
                if (a.semestre !== b.semestre) {
                    return a.semestre - b.semestre;
                }
                return a.nombre.localeCompare(b.nombre);
            });
        } catch (error) {
            console.error('Error al obtener materias:', error);
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
            const materias = [];
            querySnapshot.forEach((doc) => {
                materias.push({ id: doc.id, ...doc.data() });
            });
            
            // Ordenar por nombre en JavaScript
            return materias.sort((a, b) => a.nombre.localeCompare(b.nombre));
        } catch (error) {
            console.error('Error al obtener materias por semestre:', error);
            return [];
        }
    }

    async actualizar(id, datos) {
        try {
            const materiaRef = doc(db, this.collectionName, id);
            const updateData = {
                ...datos,
                creditos: parseInt(datos.creditos),
                semestre: parseInt(datos.semestre)
            };
            await updateDoc(materiaRef, updateData);
            return { success: true };
        } catch (error) {
            console.error('Error al actualizar materia:', error);
            return { success: false, error };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar materia:', error);
            return { success: false, error };
        }
    }
}

export default new Materia();