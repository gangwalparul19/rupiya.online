// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
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

// CRITICAL: Set auth persistence IMMEDIATELY before any auth operations
// This must happen synchronously to ensure Firebase reads from localStorage
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('[Firebase Config] ✅ Auth persistence set to LOCAL');
    
    // Force auth state check after setting persistence
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[Firebase Config] ✅ User restored from localStorage:', user.email);
      } else {
        console.log('[Firebase Config] ⚠️ No user in auth state');
      }
    });
  } catch (error) {
    console.error('[Firebase Config] ❌ Error setting auth persistence:', error);
  }
})();

// Export app for other uses
export default app;
