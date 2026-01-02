// Environment variable loader for client-side
// This file handles loading environment variables in different environments

export function getEnvVariable(key) {
  // For Vercel deployment, environment variables are injected at build time
  // We'll use a global object that gets populated by env-loader.js
  if (window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  
  // Fallback for development (you can set these in a local .env file)
  // TODO: Replace these with your actual Firebase project credentials
  // Get these from: Firebase Console > Project Settings > General > Your apps
  const envVars = {
    VITE_FIREBASE_API_KEY: 'YOUR_API_KEY_HERE',
    VITE_FIREBASE_AUTH_DOMAIN: 'YOUR_PROJECT_ID.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
    VITE_FIREBASE_STORAGE_BUCKET: 'YOUR_PROJECT_ID.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'YOUR_SENDER_ID',
    VITE_FIREBASE_APP_ID: 'YOUR_APP_ID'
  };
  
  return envVars[key] || '';
}

export function loadEnvironment() {
  return {
    firebaseApiKey: getEnvVariable('VITE_FIREBASE_API_KEY'),
    firebaseAuthDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN'),
    firebaseProjectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID'),
    firebaseStorageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET'),
    firebaseMessagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    firebaseAppId: getEnvVariable('VITE_FIREBASE_APP_ID')
  };
}
