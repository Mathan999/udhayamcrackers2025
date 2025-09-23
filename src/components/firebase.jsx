import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Add Firestore import

const firebaseConfig = {
    apiKey: "AIzaSyC8HzYSR1cN3JXTzpxSMakh_8KviOgYQLo",
  authDomain: "udhayamcrackers-4dce4.firebaseapp.com",
  databaseURL: "https://udhayamcrackers-4dce4-default-rtdb.firebaseio.com",
  projectId: "udhayamcrackers-4dce4",
  storageBucket: "udhayamcrackers-4dce4.firebasestorage.app",
  messagingSenderId: "1085906446955",
  appId: "1:1085906446955:web:dc26f7418beeb072595f2e",
  measurementId: "G-68DNVPWL2X"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);
const firestore = getFirestore(app); // Initialize Firestore

export { app, database, storage, auth, firestore }; // Export firestore