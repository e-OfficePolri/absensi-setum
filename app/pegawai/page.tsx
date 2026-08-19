'use client';

import { useState, useEffect } from 'react';
// Tambahkan storage ke dalam import firebase
import { db, auth, storage } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
// Import fungsi untuk upload ke Firebase Storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function ManajemenPegawai() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [nrp, setNrp] = useState('');
  // 1. State baru untuk pangkat dan foto
  const [pangkat, setPangkat] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  
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

  // Fungsi menangani perubahan file foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoFile(e.target.files[0]);
    }
  };

  const handleTambahPegawai = async () => {
    // 2. Validasi tambahan untuk pangkat dan foto
    if (!nama || !nrp || !pangkat) { 
      toast.error('Mohon isi Nama, NRP, dan Pangkat!'); 
      return; 
    }
    if (!fotoFile) {
      toast.error('Mohon unggah foto pegawai!'); 
      return; 
    }

    setLoading(true);
    try {
      // 3. Proses Upload Foto ke Firebase Storage
      // Membuat referensi lokasi file (folder 'foto_pegawai')
      const fotoRef = ref(storage, `foto_pegawai/${Date.now()}_${fotoFile.name}`);
      // Mengunggah file
      await uploadBytes(fotoRef, fotoFile);
      // Mendapatkan URL (link) foto yang sudah terunggah
      const fotoUrl = await getDownloadURL(fotoRef);

      // 4. Menyimpan data lengkap ke Firestore
      await addDoc(collection(db, 'pegawai'), { 
        nama: nama, 
        nrp: nrp,
        pangkat: pangkat,
        foto_url: fotoUrl, // Menyimpan link foto
        dibuat_pada: new Date().toISOString()
      });

      toast.success('Pegawai berhasil ditambahkan!');
      
      // Kosongkan form kembali
      setNama('');
      setNrp('');
      setPangkat('');
      setFotoFile(null);
      // Reset input file secara manual
      const fileInput = document.getElementById('input-foto') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      toast.error('Gagal menambahkan pegawai.');
      console.error(error);
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

  // Tambahkan pangkatLama ke dalam parameter edit
  const handleEdit = async (id: string, namaLama: string, nrpLama: string, pangkatLama: string) => {
    const namaBaru = window.prompt("Ubah Nama Pegawai:", namaLama);
    const nrpBaru = window.prompt("Ubah NRP:", nrpLama);
    const pangkatBaru = window.prompt("Ubah Pangkat:", pangkatLama);
    
    if (namaBaru && nrpBaru && pangkatBaru) {
      await updateDoc(doc(db, 'pegawai', id), { 
        nama: namaBaru,
        nrp: nrpBaru,
        pangkat: pangkatBaru
      });
      toast.success('Data pegawai diperbarui!');
    }
  };

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa otorisasi Admin...</div>;

  return (
    <main>
      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: #f1f8ff; transition: 0.3s; }
      `}} />
      <Toaster position="top-center" />
      
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

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#001f3f', fontSize: '1.3rem', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>
          Tambah Pegawai Baru
        </h2>
        
        {/* Form diperbarui dengan Pangkat dan Foto */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            value={nama} 
            onChange={(e) => setNama(e.target.value)} 
            placeholder="Nama Lengkap" 
            className="modern-input"
            style={{ flex: 1, minWidth: '200px' }} 
          />
          <input 
            value={pangkat} 
            onChange={(e) => setPangkat(e.target.value)} 
            placeholder="Pangkat" 
            className="modern-input"
            style={{ flex: 1, minWidth: '150px' }} 
          />
          <input 
            value={nrp} 
            onChange={(e) => setNrp(e.target.value)} 
            placeholder="NRP / NIP" 
            className="modern-input"
            style={{ flex: 1, minWidth: '150px' }} 
          />
          <input 
            id="input-foto"
            type="file" 
            accept="image/*"
            onChange={handleFotoChange} 
            className="modern-input"
            style={{ flex: 1, minWidth: '200px', padding: '0.7rem' }} 
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

      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#001f3f', color: 'white' }}>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Foto</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Nama Pegawai</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Pangkat</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>NRP / NIP</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftarPegawai.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>Belum ada data pegawai.</td>
              </tr>
            ) : (
              daftarPegawai.map((pegawai) => (
                <tr key={pegawai.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    {pegawai.foto_url ? (
                      <img src={pegawai.foto_url} alt={pegawai.nama} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>No Pic</div>
                    )}
                  </td>
                  <td style={{ padding: '16px', color: '#111827', fontWeight: '600' }}>{pegawai.nama}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{pegawai.pangkat || '-'}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{pegawai.nrp}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(pegawai.id, pegawai.nama, pegawai.nrp, pegawai.pangkat || '')} 
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
