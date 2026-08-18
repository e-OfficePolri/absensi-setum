'use client';

import { useState, useEffect } from 'react'; 
import { auth } from '../firebase'; 
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'; 
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
      toast.error('Email atau Password salah.'); // Pesan error ramah
    } finally {
      setLoading(false);
    }
  };

  return (
    // Memastikan posisi card berada di tengah layar secara vertikal
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh' }}>
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Menggunakan class .card dari globals.css */}
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '2.5rem 2rem' }}>
        
        {/* Logo */}
        <div style={{ 
          width: '70px', height: '70px', backgroundColor: '#f1c40f', borderRadius: '50%', 
          margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
        }}>
          <span style={{ fontSize: '2rem' }}>🏢</span>
        </div>

        {/* Judul menggunakan class .page-title */}
        <h2 className="page-title" style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>e-Absensi Setum Polri</h2>
        <p style={{ margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' }}>Silakan login untuk mengakses sistem absensi</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Email</label>
            <input 
              type="email" 
              placeholder="contoh: admin@polri.go.id" 
              className="modern-input"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Password</label>
            <input 
              type="password" 
              placeholder="Masukkan password" 
              className="modern-input"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ width: '100%' }}
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

          {/* Tombol menggunakan class .btn-primary */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: '#999' }}>
          &copy; 2026 Setum Polri. Hak Cipta Dilindungi.
        </div>
      </div>
    </main>
  );
}
