'use client';

import { useState } from 'react';
import { auth } from '../firebase'; // Memanggil auth dari firebase.ts
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // Untuk memindahkan halaman

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); // Alat untuk pindah halaman

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah halaman refresh saat tombol ditekan
    setLoading(true);
    setErrorMsg('');

    try {
      // Perintah Firebase untuk mencocokkan email dan password
      await signInWithEmailAndPassword(auth, email, password);
      // Jika sukses, lempar pengguna ke halaman utama absensi
      router.push('/'); 
    } catch (error) {
      setErrorMsg('Email/NRP atau Password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4', fontFamily: 'Arial' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#001f3f' }}>Login Absensi Setum</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Email / NRP</label>
            <input 
              type="email" 
              placeholder="contoh: 123456@setum.id" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Password</label>
            <input 
              type="password" 
              placeholder="Masukkan password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.8rem', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </div>

          {errorMsg && <p style={{ color: 'red', fontSize: '0.8rem', margin: '0' }}>{errorMsg}</p>}

          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '0.8rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
          >
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
