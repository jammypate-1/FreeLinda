import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCoVDuq8PP6Vj6PN_aEiL7BKpNESlVrUvM',
  authDomain: 'freelinda.firebaseapp.com',
  projectId: 'freelinda',
  storageBucket: 'freelinda.firebasestorage.app',
  messagingSenderId: '693505767424',
  appId: '1:693505767424:web:76821851ee037e9d9f40e5'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
export const googleProvider = new GoogleAuthProvider();

export const ALLOWED_EMAILS = [
  'jammy.pate@gmail.com',
  'linda.a.dada@gmail.com'
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User } from 'firebase/auth';
