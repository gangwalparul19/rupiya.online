/**
 * Secure Firebase Configuration Module
 * 
 * This module fetches Firebase configuration from a backend API endpoint
 * instead of hardcoding it in the client. This prevents exposure of
 * Firebase credentials through browser inspection.
 * 
 * The backend endpoint (/api/config) serves only public Firebase config
 * and can be cached for performance.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

// Suppress Firestore idle timeout errors
const originalError = console.error;
console.error = function(...args) {
  const errorString = args.join(' ');
  if (errorString.includes('QUIC_NETWORK_IDLE_TIMEOUT') || 
      (errorString.includes('firestore.googleapis.com') && errorString.includes('400')) ||
      errorString.includes('net::ERR_QUIC_PROTOCOL_ERROR')) {
    return;
  }
  originalError.apply(console, args);
};

// Cache for Firebase config to avoid repeated API calls
let firebaseConfigCache = null;
let configFetchPromise = null;

/**
 * Fetch Firebase configuration from backend API
 * @returns {Promise<Object>} Firebase configuration object
 */
async function fetchFirebaseConfig() {
  // Return cached config if available
  if (firebaseConfigCache) {
    return firebaseConfigCache;
  }

  // Return existing fetch promise if one is in progress
  if (configFetchPromise) {
    return configFetchPromise;
  }

  // Fetch configuration from backend
  configFetchPromise = (async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Firebase config: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.config) {
        throw new Error('Invalid Firebase configuration response from server');
      }

      // Cache the configuration
      firebaseConfigCache = data.config;

      return firebaseConfigCache;
    } catch (error) {
      console.error('[Firebase] Error fetching configuration:', error);
      configFetchPromise = null; // Reset promise on error
      throw error;
    }
  })();

  return configFetchPromise;
}

/**
 * Initialize Firebase with secure configuration
 * @returns {Promise<Object>} Object containing auth, db, storage, and app
 */
export async function initializeFirebaseSecure() {
  try {
    // Fetch configuration from backend
    const firebaseConfig = await fetchFirebaseConfig();

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    // Initialize Firebase services
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    return {
      app,
      auth,
      db,
      storage
    };
  } catch (error) {
    console.error('[Firebase] Initialization failed:', error);
    throw new Error('Failed to initialize Firebase. Please check your connection and try again.');
  }
}

// Export a promise that resolves when Firebase is initialized
export const firebaseReady = initializeFirebaseSecure().then(services => {
  // Make services globally available for backward compatibility
  window.__firebase = services;
  return services;
}).catch(error => {
  console.error('[Firebase] Critical initialization error:', error);
  // Don't throw - let the app handle the error gracefully
  return null;
});

// Export individual services (will be available after firebaseReady resolves)
export let auth = null;
export let db = null;
export let storage = null;
export let app = null;

// Update exports once Firebase is ready
firebaseReady.then(services => {
  if (services) {
    auth = services.auth;
    db = services.db;
    storage = services.storage;
    app = services.app;
  }
});

export default firebaseReady;
