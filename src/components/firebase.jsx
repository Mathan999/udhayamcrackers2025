import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Add Firestore import

const firebaseConfig = {
   apiKey: "AIzaSyBfWed0Cj1TfoG6Wa2p8kTaAwAW9fq94_s",
  authDomain: "muthukumar-dfadd.firebaseapp.com",
  databaseURL: "https://muthukumar-dfadd-default-rtdb.firebaseio.com",
  projectId: "muthukumar-dfadd",
  storageBucket: "muthukumar-dfadd.firebasestorage.app",
  messagingSenderId: "580205235288",
  appId: "1:580205235288:web:c8ac4c464427524c97ce2d",
  measurementId: "G-94KVFE4C9C"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);
const firestore = getFirestore(app); // Initialize Firestore

export { app, database, storage, auth, firestore }; // Export firestore