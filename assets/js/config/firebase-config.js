// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { loadEnvironment } from './env.js';

// Load environment variables
const env = loadEnvironment();

// Firebase configuration object - uses environment variables
const firebaseConfig = {
  apiKey: env.firebaseApiKey || "AIzaSyDdoA4BKaWbJIzmI9P4Se8Rkxsih6LdFvk",
  authDomain: env.firebaseAuthDomain || "rupiya-abd13.firebaseapp.com",
  projectId: env.firebaseProjectId || "rupiya-abd13",
  storageBucket: env.firebaseStorageBucket || "rupiya-abd13.firebasestorage.app",
  messagingSenderId: env.firebaseMessagingSenderId || "999011154370",
  appId: env.firebaseAppId || "1:999011154370:web:40faebc7a935cdbf51be5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export app for other uses
export default app;
