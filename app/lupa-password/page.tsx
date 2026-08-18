'use client';

import { useState, useEffect } from 'react';
import { auth } from '../firebase'; 
import { sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function LupaPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); 

  // KODE PERLINDUNGAN AKSES 
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
    // Memastikan posisi card berada di tengah layar
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh' }}>
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Menggunakan class .card dari globals.css */}
      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '2.5rem 2rem' }}>
        
        {/* Ikon Gembok */}
        <div style={{ 
          width: '70px', height: '70px', backgroundColor: '#f1c40f', borderRadius: '50%', 
          margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
        }}>
          <span style={{ fontSize: '2rem' }}>🔐</span>
        </div>

        {/* Judul menggunakan class .page-title */}
        <h2 className="page-title" style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Lupa Password</h2>
        <p style={{ margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' }}>Masukkan email terdaftar Anda untuk menerima tautan reset kata sandi.</p>
        
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Email Terdaftar</label>
            <input 
              type="email" 
              placeholder="contoh: 123456@polri.go.id" 
              className="modern-input"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Tombol menggunakan class .btn-primary */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>

        {/* Tombol Kembali */}
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
