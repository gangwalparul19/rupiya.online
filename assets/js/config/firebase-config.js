// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDdoA4BKaWbJIzmI9P4Se8Rkxsih6LdFvk",
  authDomain: "rupiya-abd13.firebaseapp.com",
  projectId: "rupiya-abd13",
  storageBucket: "rupiya-abd13.firebasestorage.app",
  messagingSenderId: "999011154370",
  appId: "1:999011154370:web:40faebc7a935cdbf51be5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export app for other uses
export default app;
