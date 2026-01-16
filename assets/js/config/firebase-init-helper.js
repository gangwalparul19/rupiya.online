/**
 * Firebase Initialization Helper
 * 
 * This module provides utilities to initialize Firebase securely.
 * It handles both the new secure method (fetching from API) and
 * a fallback for development environments.
 */

import { initializeFirebaseSecure } from './firebase-config-secure.js';

// Global Firebase instance
let firebaseInstance = null;
let initializationPromise = null;

/**
 * Initialize Firebase with automatic fallback
 * Tries secure method first, falls back to environment variables if needed
 */
export async function initializeFirebase() {
  // Return existing instance if already initialized
  if (firebaseInstance) {
    return firebaseInstance;
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Try secure initialization (fetching from API)
      firebaseInstance = await initializeFirebaseSecure();
      return firebaseInstance;
    } catch (error) {
      console.error('[Firebase] Secure initialization failed:', error);
      console.warn('[Firebase] Falling back to environment variables (development only)');
      
      // Fallback: Try to use environment variables
      try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js');
        const { loadEnvironment } = await import('./env.js');

        const env = loadEnvironment();
        
        if (!env.firebaseApiKey) {
          throw new Error('Firebase API key not found in environment variables');
        }

        const firebaseConfig = {
          apiKey: env.firebaseApiKey,
          authDomain: env.firebaseAuthDomain,
          projectId: env.firebaseProjectId,
          storageBucket: env.firebaseStorageBucket,
          messagingSenderId: env.firebaseMessagingSenderId,
          appId: env.firebaseAppId
        };

        const app = initializeApp(firebaseConfig);
        firebaseInstance = {
          app,
          auth: getAuth(app),
          db: getFirestore(app),
          storage: getStorage(app)
        };

        return firebaseInstance;
      } catch (fallbackError) {
        console.error('[Firebase] Fallback initialization also failed:', fallbackError);
        throw new Error('Failed to initialize Firebase. Please check your configuration.');
      }
    }
  })();

  return initializationPromise;
}

/**
 * Get Firebase services (auth, db, storage)
 * Ensures Firebase is initialized before returning services
 */
export async function getFirebaseServices() {
  const instance = await initializeFirebase();
  if (!instance) {
    throw new Error('Firebase services are not available');
  }
  return {
    auth: instance.auth,
    db: instance.db,
    storage: instance.storage,
    app: instance.app
  };
}

/**
 * Get individual Firebase service
 */
export async function getFirebaseAuth() {
  const services = await getFirebaseServices();
  return services.auth;
}

export async function getFirebaseDb() {
  const services = await getFirebaseServices();
  return services.db;
}

export async function getFirebaseStorage() {
  const services = await getFirebaseServices();
  return services.storage;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized() {
  return firebaseInstance !== null;
}

/**
 * Get Firebase instance (synchronous, may be null if not initialized yet)
 */
export function getFirebaseInstance() {
  return firebaseInstance;
}

export default initializeFirebase;
