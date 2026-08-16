import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyCmu-VOUrhgEZxoFTC0rgVN15vKwThezyA",
  authDomain: "absensi-setum.firebaseapp.com",
  projectId: "absensi-setum",
  storageBucket: "absensi-setum.firebasestorage.app",
  messagingSenderId: "130947937553",
  appId: "1:130947937553:web:..."
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
