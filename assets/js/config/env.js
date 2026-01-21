// Environment variable loader for client-side
// This file handles loading environment variables in different environments
// Environment variables are injected at build time by build.js on Vercel

let validationWarningShown = false;

export function getEnvVariable(key) {
  // For Vercel deployment, environment variables are injected at build time
  // The build.js script injects window.__ENV__ into HTML files
  if (window.__ENV__ && window.__ENV__[key] && window.__ENV__[key].trim() !== '') {
    return window.__ENV__[key];
  }
  
  // Show error only once to avoid console spam
  if (!validationWarningShown) {
    console.error(`[ENV] Missing environment variable: ${key}. Make sure build.js ran with environment variables set.`);
  }
  return '';
}

export function validateEnvironment() {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missing = requiredVars.filter(key => {
    const value = window.__ENV__ && window.__ENV__[key];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    validationWarningShown = true;
    console.error('[ENV] Missing required environment variables:', missing);
    console.error('[ENV] Firebase will not initialize properly. Check your build configuration.');
    return false;
  }

  return true;
}

export function loadEnvironment() {
  // Validate before loading
  const isValid = validateEnvironment();
  
  if (!isValid) {
    console.warn('[ENV] Loading environment with missing variables - app may not function correctly');
  }

  return {
    firebaseApiKey: getEnvVariable('VITE_FIREBASE_API_KEY'),
    firebaseAuthDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN'),
    firebaseProjectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID'),
    firebaseStorageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET'),
    firebaseMessagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    firebaseAppId: getEnvVariable('VITE_FIREBASE_APP_ID')
  };
}
