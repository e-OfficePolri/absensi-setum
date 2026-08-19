// app/utils/buatAkunPersonel.ts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase'; 

export const daftarkanAkunPersonel = async (
  idDokumen: string, 
  emailInput: string, 
  passwordInput: string
) => {
  try {
    // 1. Membuat "Aplikasi Kedua" agar Admin tidak ter-logout
    const appPendaftaran = initializeApp(firebaseConfig, 'PendaftaranApp');
    const authPendaftaran = getAuth(appPendaftaran);

    // 2. Mendaftarkan email dan password
    const userCredential = await createUserWithEmailAndPassword(authPendaftaran, emailInput, passwordInput);
    const userBaru = userCredential.user;

    // 3. Menyimpan Email dan UID ke database pegawai
    const referensiPersonel = doc(db, 'pegawai', idDokumen); 
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
