// firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 1. Konfigurasi Firebase
// Nilai-nilai ini diambil dari file .env.local untuk menjaga keamanan data rahasia
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 2. Mencegah Inisialisasi Ganda
// Next.js sering memuat ulang halaman saat proses pembuatan aplikasi.
// Kode ini memastikan Firebase hanya diaktifkan satu kali.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 3. Menginisialisasi layanan yang dibutuhkan aplikasi
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 4. Mengekspor layanan agar bisa digunakan oleh file lain (misalnya page.tsx)
export { auth, db, storage };
