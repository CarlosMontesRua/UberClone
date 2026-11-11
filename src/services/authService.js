import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase';

const getRegistrationError = (error) => {
  const code = error?.code || '';
  let message;

  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    message =
      'Firebase Authentication no tiene activo el proveedor Correo/Contraseña. En Firebase Console abre Authentication > Sign-in method, activa Email/Password y guarda los cambios.';
  } else if (/invalid-api-key|api-key-not-valid/i.test(code)) {
    message =
      'La API key de Firebase no corresponde a este proyecto. Verifica que los valores de .env provengan de la misma app web y reinicia Expo con npx expo start --clear.';
  }

  if (!message) return error;

  const registrationError = new Error(message);
  registrationError.code = code;
  return registrationError;
};

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
    try {
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return credentials.user;
    } catch (error) {
      throw getRegistrationError(error);
    }
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

