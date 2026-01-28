// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { loadEnvironment } from './env.js';

// Suppress only known benign Firestore idle timeout errors
// These are normal behavior when Firestore connection goes idle and don't affect functionality
// All other errors will be logged normally for debugging
const originalError = console.error;
const suppressedPatterns = [
  'QUIC_NETWORK_IDLE_TIMEOUT',
  'net::ERR_QUIC_PROTOCOL_ERROR'
];

console.error = function(...args) {
  const errorString = args.join(' ');
  
  // Only suppress specific known benign errors
  const shouldSuppress = suppressedPatterns.some(pattern => errorString.includes(pattern)) &&
                         errorString.includes('firestore.googleapis.com');
  
  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
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

// Handle auth persistence issues in restricted browser environments
// Some in-app browsers (like Gmail app) restrict sessionStorage access
try {
  // Test if sessionStorage is accessible
  sessionStorage.setItem('test', 'test');
  sessionStorage.removeItem('test');
} catch (e) {
  console.warn('SessionStorage not accessible, auth state may not persist in this browser');
  // Firebase will automatically fall back to memory-only persistence
  // Users may need to open the link in their default browser
}

// Auth persistence is LOCAL by default in Firebase v10+
// No need to call setPersistence explicitly

// Export app for other uses
export default app;
