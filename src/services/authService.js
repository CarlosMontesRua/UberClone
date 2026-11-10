import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase';

export const authService = {
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Correo electrónico y contraseña requeridos');
    }
    const auth = getFirebaseAuth();
    const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credentials.user;
  },

  async register(email, password) {
    if (!email || !password) {
      throw new Error('Correo electrónico y contraseña requeridos');
    }
    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    const auth = getFirebaseAuth();
    const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return credentials.user;
  },

  async logout() {
    const auth = getFirebaseAuth();
    await signOut(auth);
  },

  getCurrentUser() {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  },

  subscribeToAuthState(callback) {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  },
};

export default authService;

