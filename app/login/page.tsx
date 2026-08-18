'use client';

import { useState, useEffect } from 'react'; // Tambahkan useEffect
import { auth } from '../firebase'; 
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'; // Tambahkan onAuthStateChanged
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); 

  // --- FITUR TAMBAHAN: Perlindungan Akses ---
  // Mengecek apakah pengguna sudah login sebelumnya
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Jika ternyata sudah login, langsung arahkan ke Dashboard
        router.push('/');
      }
    });
    // Membersihkan memori saat komponen ditutup
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    
    const loadingToast = toast.loading('Memeriksa kredensial...');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.dismiss(loadingToast);
      toast.success('Login berhasil!');
      router.push('/'); 
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Email atau Password salah.'); // Pesan error diubah agar lebih ramah
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#001f3f', 
      fontFamily: 'Arial, sans-serif',
      padding: '1rem'
    }}>
      <Toaster position="top-center" reverseOrder={false} />
      
      <div style={{ 
        background: 'white', 
        padding: '2.5rem 2rem', 
        borderRadius: '12px', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', 
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        
        <div style={{ 
          width: '70px', 
          height: '70px', 
          backgroundColor: '#f1c40f', 
          borderRadius: '50%', 
          margin: '0 auto 1.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '2rem' }}>🏢</span>
        </div>

        <h2 style={{ margin: '0 0 0.5rem', color: '#001f3f', fontSize: '1.5rem' }}>e-Absensi Setum Polri</h2>
        <p style={{ margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' }}>Silakan login untuk mengakses sistem absensi</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#333' }}>Email</label>
            <input 
              type="email" 
              placeholder="contoh: admin@polri.go.id" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#333' }}>Password</label>
            <input 
              type="password" 
              placeholder="Masukkan password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' }}
            />
            
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => router.push('/lupa-password')} 
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
              >
                Lupa Password?
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '1rem', 
              background: '#001f3f', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              marginTop: '10px',
              fontSize: '1rem',
              boxShadow: '0 4px 6px rgba(0, 31, 63, 0.2)'
            }}
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#999' }}>
          &copy; 2026 Setum Polri. Hak Cipta Dilindungi.
        </div>
      </div>
    </main>
  );
}
