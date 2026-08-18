'use client';

// 1. IMPORT DILETAKKAN DI PALING ATAS (Perhatikan tambahan useEffect di sini)
import { useState, useEffect } from 'react';
import { auth } from '../firebase'; 
// Perhatikan tambahan onAuthStateChanged di sini
import { sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function LupaPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); 

  // 2. KODE PERLINDUNGAN AKSES DILETAKKAN DI SINI
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/'); // Lempar ke halaman utama jika sudah login
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (!email) {
      toast.error('Mohon masukkan email Anda!');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Mengirim tautan reset...');

    try {
      await sendPasswordResetEmail(auth, email);
      
      toast.dismiss(loadingToast);
      toast.success('Tautan reset password telah dikirim ke email Anda!');
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Gagal mengirim tautan. Pastikan email Anda terdaftar di sistem.');
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
          <span style={{ fontSize: '2rem' }}>🔐</span>
        </div>

        <h2 style={{ margin: '0 0 0.5rem', color: '#001f3f', fontSize: '1.5rem' }}>Lupa Password</h2>
        <p style={{ margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' }}>Masukkan email terdaftar Anda untuk menerima tautan reset kata sandi.</p>
        
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#333' }}>Email Terdaftar</label>
            <input 
              type="email" 
              placeholder="contoh: 123456@polri.go.id" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
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
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <button 
            onClick={() => router.push('/login')} 
            style={{ background: 'none', border: 'none', color: '#001f3f', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    </main>
  );
}
