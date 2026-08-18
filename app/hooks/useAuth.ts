// app/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { auth } from '../firebase'; // Pastikan path impor firebase ini benar
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  // State untuk menyimpan status autentikasi
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  
  // Variabel email admin
  const EMAIL_ADMIN = "98010786@polri.go.id";

  useEffect(() => {
    // Mengecek status login user menggunakan Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(user.email === EMAIL_ADMIN); // Set true jika email cocok
        setIsCheckingAuth(false); // Selesai mengecek
      } else {
        router.push('/login'); // Lempar ke halaman login jika belum masuk
      }
    });

    // Membersihkan listener saat komponen dibongkar (unmount)
    return () => unsubscribeAuth();
  }, [router]);

  // Fungsi untuk logout
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Mengembalikan nilai agar bisa digunakan oleh file/komponen lain
  return { isCheckingAuth, isAdmin, handleLogout };
};
