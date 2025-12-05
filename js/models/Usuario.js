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

class Usuario {
    constructor() {
        this.collectionName = 'usuarios';
    }

    async crear(usuario, password, rol, docenteId = null) {
        try {
            // Validar que el rol sea válido
            const rolesValidos = ['subdirector', 'jefe', 'docente'];
            if (!rolesValidos.includes(rol)) {
                return { 
                    success: false, 
                    mensaje: `Rol inválido. Debe ser: ${rolesValidos.join(', ')}` 
                };
            }

            const userData = {
                usuario,
                password, // En producción, hashear la contraseña
                rol, // ASEGURAR que el rol se guarde correctamente
                activo: true,
                fechaCreacion: new Date().toISOString()
            };

            // Si es docente y tiene docenteId, agregarlo
            if (rol === 'docente' && docenteId) {
                userData.docenteId = docenteId;
            }

            console.log('📝 Creando usuario con datos:', userData); // DEBUG

            const docRef = await addDoc(collection(db, this.collectionName), userData);
            
            return { 
                id: docRef.id, 
                success: true,
                mensaje: `Usuario creado exitosamente con rol: ${rol}`
            };
        } catch (error) {
            console.error('❌ Error al crear usuario:', error);
            return { success: false, error, mensaje: error.message };
        }
    }

    async validarCredenciales(usuario, password, rol) {
        try {
            console.log('🔍 Validando credenciales:', { usuario, rol }); // DEBUG

            const q = query(
                collection(db, this.collectionName),
                where('usuario', '==', usuario),
                where('password', '==', password),
                where('rol', '==', rol),
                where('activo', '==', true)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                console.log('✅ Usuario encontrado:', userData); // DEBUG
                
                return {
                    success: true,
                    usuario: {
                        id: querySnapshot.docs[0].id,
                        ...userData
                    }
                };
            }
            
            console.log('❌ Credenciales inválidas'); // DEBUG
            return { success: false, mensaje: 'Credenciales inválidas o usuario inactivo' };
        } catch (error) {
            console.error('❌ Error al validar credenciales:', error);
            return { success: false, error, mensaje: error.message };
        }
    }

    async obtenerTodos() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const usuarios = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                usuarios.push({ 
                    id: doc.id, 
                    ...data,
                    // Asegurar que el rol esté presente
                    rol: data.rol || 'desconocido'
                });
            });
            console.log('📋 Usuarios obtenidos:', usuarios); // DEBUG
            return usuarios;
        } catch (error) {
            console.error('❌ Error al obtener usuarios:', error);
            return [];
        }
    }

    async obtenerPorRol(rol) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('rol', '==', rol)
            );
            const querySnapshot = await getDocs(q);
            const usuarios = [];
            querySnapshot.forEach((doc) => {
                usuarios.push({ id: doc.id, ...doc.data() });
            });
            return usuarios;
        } catch (error) {
            console.error('❌ Error al obtener usuarios por rol:', error);
            return [];
        }
    }

    async actualizar(id, datos) {
        try {
            // Si se está actualizando el rol, validarlo
            if (datos.rol) {
                const rolesValidos = ['subdirector', 'jefe', 'docente'];
                if (!rolesValidos.includes(datos.rol)) {
                    return { 
                        success: false, 
                        mensaje: `Rol inválido. Debe ser: ${rolesValidos.join(', ')}` 
                    };
                }
            }

            console.log('📝 Actualizando usuario:', id, datos); // DEBUG

            const usuarioRef = doc(db, this.collectionName, id);
            await updateDoc(usuarioRef, datos);
            
            return { 
                success: true,
                mensaje: 'Usuario actualizado correctamente'
            };
        } catch (error) {
            console.error('❌ Error al actualizar usuario:', error);
            return { success: false, error, mensaje: error.message };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            return { 
                success: true,
                mensaje: 'Usuario eliminado correctamente'
            };
        } catch (error) {
            console.error('❌ Error al eliminar usuario:', error);
            return { success: false, error, mensaje: error.message };
        }
    }

    // Método adicional para verificar usuarios en la base de datos
    async verificarUsuario(usuarioId) {
        try {
            const usuarios = await this.obtenerTodos();
            const usuario = usuarios.find(u => u.id === usuarioId);
            
            if (usuario) {
                console.log('✅ Usuario verificado:', usuario);
                return { success: true, usuario };
            }
            
            console.log('❌ Usuario no encontrado');
            return { success: false, mensaje: 'Usuario no encontrado' };
        } catch (error) {
            console.error('❌ Error al verificar usuario:', error);
            return { success: false, error };
        }
    }
}

export default new Usuario();