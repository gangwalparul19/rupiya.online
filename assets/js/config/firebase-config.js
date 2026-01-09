// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { loadEnvironment } from './env.js';

// Suppress Firestore idle timeout errors that appear in console
// These are normal behavior when Firestore connection goes idle
const originalError = console.error;
console.error = function(...args) {
  // Filter out Firestore idle timeout errors
  const errorString = args.join(' ');
  if (errorString.includes('QUIC_NETWORK_IDLE_TIMEOUT') || 
      (errorString.includes('firestore.googleapis.com') && errorString.includes('400')) ||
      errorString.includes('net::ERR_QUIC_PROTOCOL_ERROR')) {
    return; // Suppress these specific errors
  }
  originalError.apply(console, args);
};

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
