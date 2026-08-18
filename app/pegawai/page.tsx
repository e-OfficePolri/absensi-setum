'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function ManajemenPegawai() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [nrp, setNrp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [daftarPegawai, setDaftarPegawai] = useState<any[]>([]);

  const EMAIL_ADMIN = "98010786@polri.go.id";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === EMAIL_ADMIN) {
        setIsCheckingAuth(false);
      } else {
        toast.error('Akses ditolak. Anda bukan Admin.');
        router.push('/'); 
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarPegawai(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

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

  const handleHapus = async (id: string) => {
    if (window.confirm("Yakin ingin menghapus pegawai ini?")) {
      await deleteDoc(doc(db, 'pegawai', id));
      toast.success('Data pegawai dihapus!');
    }
  };

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

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa otorisasi Admin...</div>;

  return (
    <main>
      {/* CSS Tambahan untuk efek Hover pada Tabel */}
      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: #f1f8ff; transition: 0.3s; }
      `}} />
      <Toaster position="top-center" />
      
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '3px solid #001f3f' }}>
        <h1 className="page-title">Manajemen Data Pegawai</h1>
        <button 
          onClick={() => router.push('/')} 
          className="btn-primary" 
          style={{ background: '#6c757d', padding: '0.6rem 1.2rem', boxShadow: '0 2px 4px rgba(108, 117, 125, 0.3)' }}
        >
          &larr; Kembali
        </button>
      </div>

      {/* Form Tambah Pegawai Menggunakan Class Global */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#001f3f', fontSize: '1.3rem', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>
          Tambah Pegawai Baru
        </h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input 
            value={nama} 
            onChange={(e) => setNama(e.target.value)} 
            placeholder="Nama Lengkap" 
            className="modern-input"
            style={{ flex: 1, minWidth: '200px' }} 
          />
          <input 
            value={nrp} 
            onChange={(e) => setNrp(e.target.value)} 
            placeholder="NRP / NIK" 
            className="modern-input"
            style={{ flex: 1, minWidth: '150px' }} 
          />
          <button 
            onClick={handleTambahPegawai} 
            disabled={loading} 
            className="btn-primary"
            style={{ background: '#10b981', minWidth: '160px', boxShadow: loading ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.2)' }}
          >
            {loading ? 'Menyimpan...' : '+ Tambah Data'}
          </button>
        </div>
      </div>

      {/* Tabel Daftar Pegawai Modern (Menyesuaikan tabel di page.tsx) */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#001f3f', color: 'white' }}>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Nama Pegawai</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>NRP / NIK</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>Belum ada data pegawai.</td>
              </tr>
            ) : (
              daftarPegawai.map((pegawai) => (
                <tr key={pegawai.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px', color: '#111827', fontWeight: '600' }}>{pegawai.nama}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{pegawai.nrp}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(pegawai.id, pegawai.nama, pegawai.nrp)} 
                        style={{ padding: '0.4rem 0.8rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition:'0.2s' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleHapus(pegawai.id)} 
                        style={{ padding: '0.4rem 0.8rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition:'0.2s' }}
                      >
                        Hapus
                      </button>
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
