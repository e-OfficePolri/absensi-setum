'use client';

import { useState } from 'react';
import { auth } from '../firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
// Menambahkan Toast untuk halaman login
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    
    // Memunculkan loading toast
    const loadingToast = toast.loading('Memeriksa kredensial...');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Jika berhasil, matikan loading dan masuk ke halaman utama
      toast.dismiss(loadingToast);
      toast.success('Login berhasil!');
      router.push('/'); 
    } catch (error) {
      // Jika gagal, matikan loading dan munculkan pesan error
      toast.dismiss(loadingToast);
      toast.error('Email/NRP atau Password salah.');
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
      backgroundColor: '#001f3f', // Background Biru Navy khas instansi
      fontFamily: 'Arial, sans-serif',
      padding: '1rem'
    }}>
      {/* Memasang Toaster di halaman login */}
      <Toaster position="top-center" reverseOrder={false} />
      
      <div style={{ 
        background: 'white', 
        padding: '2.5rem 2rem', 
        borderRadius: '12px', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', // Bayangan lembut
        width: '100%', 
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        
        {/* Tempat untuk Logo Instansi */}
        <div style={{ 
          width: '70px', 
          height: '70px', 
          backgroundColor: '#f1c40f', // Warna emas/kuning
          borderRadius: '50%', 
          margin: '0 auto 1.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '2rem' }}>🏢</span>
        </div>

        <h2 style={{ margin: '0 0 0.5rem', color: '#001f3f', fontSize: '1.5rem' }}>E-Office Setum Polri</h2>
        <p style={{ margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' }}>Silakan login untuk mengakses sistem absensi</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#333' }}>Email / NRP</label>
            <input 
              type="email" 
              placeholder="contoh: 123456@setum.id" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ 
                width: '100%', 
                padding: '0.8rem', 
                marginTop: '5px', 
                borderRadius: '6px', 
                border: '1px solid #ccc',
                boxSizing: 'border-box', // Mencegah input melebar keluar kotak
                fontSize: '1rem'
              }}
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
              style={{ 
                width: '100%', 
                padding: '0.8rem', 
                marginTop: '5px', 
                borderRadius: '6px', 
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                fontSize: '1rem'
              }}
            />
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
            {loading ? 'Memeriksa...' : 'Masuk Sistem'}
          </button>
        </form>

        {/* Footer Kecil di Bawah */}
        <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#999' }}>
          &copy; 2026 Setum Polri. Hak Cipta Dilindungi.
        </div>
      </div>
    </main>
  );
}
