// Importações necessárias do Firebase v10+ (via CDN/Módulo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do seu projeto extraída do console
const firebaseConfig = {
  apiKey: "AIzaSyBtv-nJcs-olPAiq-npKBpwAXEjWOMrGv8",
  authDomain: "trip-planner-3ee4d.firebaseapp.com",
  projectId: "trip-planner-3ee4d",
  storageBucket: "trip-planner-3ee4d.firebasestorage.app",
  messagingSenderId: "520488508590",
  appId: "1:520488508590:web:bf706755d2517dcb82a13f"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias de Autenticação e Banco de Dados para usar no main.js
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);