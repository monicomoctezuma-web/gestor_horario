// js/config/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD7l_aO5PmqKyXY-6DeQEPJBXA42LJ4jg8",
    authDomain: "gestor-horarios-c861d.firebaseapp.com",
    databaseURL: "https://gestor-horarios-c861d-default-rtdb.firebaseio.com",
    projectId: "gestor-horarios-c861d",
    storageBucket: "gestor-horarios-c861d.firebasestorage.app",
    messagingSenderId: "831923214436",
    appId: "1:831923214436:web:543d5d1616a8d9dce76771"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);