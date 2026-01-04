// Environment variable loader for client-side
// This file handles loading environment variables in different environments
// Environment variables are injected at build time by build.js on Vercel

export function getEnvVariable(key) {
  // For Vercel deployment, environment variables are injected at build time
  // The build.js script injects window.__ENV__ into HTML files
  if (window.__ENV__ && window.__ENV__[key] && window.__ENV__[key].trim() !== '') {
    return window.__ENV__[key];
  }
  
  // No fallback - if env vars aren't injected, show clear error
  console.error(`[ENV] Missing environment variable: ${key}. Make sure build.js ran with environment variables set.`);
  return '';
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
