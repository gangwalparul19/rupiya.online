// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { loadEnvironment } from './env.js';

// Load environment variables
const env = loadEnvironment();

// Firebase configuration object - uses environment variables
const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth persistence is LOCAL by default in Firebase v10+
// No need to call setPersistence explicitly
console.log('[Firebase] Initialized successfully');

// Export app for other uses
export default app;
