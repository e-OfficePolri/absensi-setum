'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Sesuaikan path jika firebase.ts ada di luar folder
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function ManajemenPegawai() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // State untuk form input
  const [nama, setNama] = useState('');
  const [nrp, setNrp] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State untuk menyimpan daftar pegawai dari database
  const [daftarPegawai, setDaftarPegawai] = useState<any[]>([]);

  const EMAIL_ADMIN = "98010786@polri.go.id";

  // 1. Memeriksa apakah yang mengakses adalah Admin
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === EMAIL_ADMIN) {
        setIsCheckingAuth(false);
      } else {
        toast.error('Akses ditolak. Anda bukan Admin.');
        router.push('/'); // Lempar kembali ke halaman utama jika bukan admin
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 2. Mengambil data pegawai dari Firestore secara real-time
  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarPegawai(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  // 3. Fungsi untuk menambahkan pegawai baru
  const handleTambahPegawai = async () => {
    if (!nama || !nrp) { 
      toast.error('Mohon isi Nama dan NRP!'); 
      return; 
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pegawai'), { 
        nama: nama, 
        nrp: nrp,
        dibuat_pada: new Date().toISOString()
      });
      toast.success('Pegawai berhasil ditambahkan!');
      setNama('');
      setNrp('');
    } catch (error) {
      toast.error('Gagal menambahkan pegawai.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Fungsi untuk menghapus pegawai
  const handleHapus = async (id: string) => {
    if (window.confirm("Yakin ingin menghapus pegawai ini?")) {
      await deleteDoc(doc(db, 'pegawai', id));
      toast.success('Data pegawai dihapus!');
    }
  };

  // 5. Fungsi untuk mengedit nama pegawai
  const handleEdit = async (id: string, namaLama: string, nrpLama: string) => {
    const namaBaru = window.prompt("Ubah Nama Pegawai:", namaLama);
    const nrpBaru = window.prompt("Ubah NRP:", nrpLama);
    
    if (namaBaru && nrpBaru) {
      await updateDoc(doc(db, 'pegawai', id), { 
        nama: namaBaru,
        nrp: nrpBaru
      });
      toast.success('Data pegawai diperbarui!');
    }
  };

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center' }}>Memeriksa otorisasi Admin...</div>;

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <Toaster position="top-center" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#001f3f' }}>Manajemen Data Pegawai</h1>
        <button onClick={() => router.push('/')} style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Kembali ke Home</button>
      </div>

      {/* Form Tambah Pegawai */}
      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Tambah Pegawai Baru</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            value={nama} 
            onChange={(e) => setNama(e.target.value)} 
            placeholder="Nama Lengkap" 
            style={{ padding: '0.8rem', flex: 1, minWidth: '200px', borderRadius: '5px', border: '1px solid #ccc' }} 
          />
          <input 
            value={nrp} 
            onChange={(e) => setNrp(e.target.value)} 
            placeholder="NRP / NIK" 
            style={{ padding: '0.8rem', flex: 1, minWidth: '150px', borderRadius: '5px', border: '1px solid #ccc' }} 
          />
          <button 
            onClick={handleTambahPegawai} 
            disabled={loading} 
            style={{ padding: '0.8rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Menyimpan...' : 'Tambah Data'}
          </button>
        </div>
      </div>

      {/* Tabel Daftar Pegawai */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr style={{ background: '#001f3f', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Nama Pegawai</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>NRP</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Belum ada data pegawai.</td>
              </tr>
            ) : (
              daftarPegawai.map((pegawai) => (
                <tr key={pegawai.id}>
                  <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{pegawai.nama}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{pegawai.nrp}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(pegawai.id, pegawai.nama, pegawai.nrp)} style={{ padding: '0.3rem 0.6rem', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Edit</button>
                      <button onClick={() => handleHapus(pegawai.id)} style={{ padding: '0.3rem 0.6rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
