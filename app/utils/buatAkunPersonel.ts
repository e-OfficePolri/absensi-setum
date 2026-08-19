// app/utils/buatAkunPersonel.ts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase'; // Sesuaikan lokasi impor firebase Anda

/**
 * Fungsi untuk mendaftarkan akun personel tanpa membuat Admin logout
 */
export const daftarkanAkunPersonel = async (
  idDokumen: string, 
  emailInput: string, 
  passwordInput: string
) => {
  try {
    // 1. Membuat "Aplikasi Kedua" khusus untuk mendaftarkan user
    // Menggunakan nama unik (misal: 'PendaftaranApp') agar tidak bertabrakan dengan aplikasi utama
    const appPendaftaran = initializeApp(firebaseConfig, 'PendaftaranApp');
    const authPendaftaran = getAuth(appPendaftaran);

    // 2. Mendaftarkan email dan password ke Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(authPendaftaran, emailInput, passwordInput);
    const userBaru = userCredential.user;

    // 3. Menyimpan Email dan UID (ID Unik) ke data Firestore personel tersebut
    const referensiPersonel = doc(db, 'pegawai', idDokumen); // Pastikan nama koleksinya 'pegawai' atau sesuaikan dengan database Anda
    await updateDoc(referensiPersonel, {
      email: emailInput,
      uidAuth: userBaru.uid
    });

    return { sukses: true, pesan: "Akun berhasil dibuat!" };
  } catch (error: any) {
    console.error("Gagal membuat akun:", error);
    return { sukses: false, pesan: error.message };
  }
};
