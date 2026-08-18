import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCmu-V0UrhgEZxoFTC0rgVN15vKwThezyA",
  authDomain: "absensi-setum.firebaseapp.com",
  projectId: "absensi-setum",
  storageBucket: "absensi-setum.firebasestorage.app",
  messagingSenderId: "130947937553",
  appId: "1:130947937553:web:3421f311b413e2197548b0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
