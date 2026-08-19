'use client';

import { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function ManajemenPersonel() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // State untuk form tambah data
  const [nama, setNama] = useState('');
  const [nrp, setNrp] = useState('');
  const [pangkat, setPangkat] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [daftarPersonel, setDaftarPersonel] = useState<any[]>([]);

  // State untuk Modal Edit
  const [isModalEditBuka, setIsModalEditBuka] = useState(false);
  const [dataEdit, setDataEdit] = useState({ id: '', nama: '', nrp: '', pangkat: '', foto_url: '' }); 
  const [fotoFileEdit, setFotoFileEdit] = useState<File | null>(null); 
  const [loadingEdit, setLoadingEdit] = useState(false);

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
    // Catatan: Koleksi database tetap bernama 'pegawai' agar data lama tidak hilang
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarPersonel(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoFile(e.target.files[0]);
    }
  };

  const handleFotoEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoFileEdit(e.target.files[0]);
    }
  };

  const handleTambahPersonel = async () => {
    if (!nama || !nrp || !pangkat) { 
      toast.error('Mohon isi Nama, NRP, dan Pangkat!'); 
      return; 
    }
    if (!fotoFile) {
      toast.error('Mohon unggah foto personel!'); 
      return; 
    }

    setLoading(true);
    try {
      const fotoRef = ref(storage, `foto_pegawai/${Date.now()}_${fotoFile.name}`);
      await uploadBytes(fotoRef, fotoFile);
      const fotoUrl = await getDownloadURL(fotoRef);

      await addDoc(collection(db, 'pegawai'), { 
        nama: nama, 
        nrp: nrp,
        pangkat: pangkat,
        foto_url: fotoUrl,
        dibuat_pada: new Date().toISOString()
      });

      toast.success('Personel berhasil ditambahkan!');
      
      setNama('');
      setNrp('');
      setPangkat('');
      setFotoFile(null);
      const fileInput = document.getElementById('input-foto') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      toast.error('Gagal menambahkan personel.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleHapus = async (id: string) => {
    if (window.confirm("Yakin ingin menghapus personel ini?")) {
      await deleteDoc(doc(db, 'pegawai', id));
      toast.success('Data personel dihapus!');
    }
  };

  const bukaModalEdit = (personel: any) => {
    setDataEdit({
      id: personel.id,
      nama: personel.nama,
      nrp: personel.nrp,
      pangkat: personel.pangkat || '',
      foto_url: personel.foto_url || '' 
    });
    setFotoFileEdit(null); 
    setIsModalEditBuka(true);
  };

  const simpanPerubahanEdit = async () => {
    if (!dataEdit.nama || !dataEdit.nrp || !dataEdit.pangkat) {
      toast.error("Semua kolom harus diisi!");
      return;
    }

    setLoadingEdit(true);
    try {
      let updatedFotoUrl = dataEdit.foto_url;

      if (fotoFileEdit) {
        const fotoRef = ref(storage, `foto_pegawai/${Date.now()}_${fotoFileEdit.name}`);
        await uploadBytes(fotoRef, fotoFileEdit);
        updatedFotoUrl = await getDownloadURL(fotoRef);
      }

      await updateDoc(doc(db, 'pegawai', dataEdit.id), { 
        nama: dataEdit.nama,
        nrp: dataEdit.nrp,
        pangkat: dataEdit.pangkat,
        foto_url: updatedFotoUrl 
      });

      toast.success('Data personel diperbarui!');
      setIsModalEditBuka(false); 
    } catch (error) {
      toast.error('Gagal memperbarui data.');
    } finally {
      setLoadingEdit(false);
    }
  };

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa otorisasi Admin...</div>;

  return (
    <main style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: #f1f8ff; transition: 0.3s; }
      `}} />
      <Toaster position="top-center" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '3px solid #001f3f' }}>
        <h1 className="page-title">Manajemen Data Personel</h1>
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
          Tambah Personel Baru
        </h2>
        
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
            onClick={handleTambahPersonel} 
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
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Nama Personel</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Pangkat</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>NRP / NIP</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftarPersonel.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>Belum ada data personel.</td>
              </tr>
            ) : (
              daftarPersonel.map((personel) => (
                <tr key={personel.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px' }}>
                    {personel.foto_url ? (
                      <img src={personel.foto_url} alt={personel.nama} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>No Pic</div>
                    )}
                  </td>
                  <td style={{ padding: '16px', color: '#111827', fontWeight: '600' }}>{personel.nama}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{personel.pangkat || '-'}</td>
                  <td style={{ padding: '16px', color: '#4b5563' }}>{personel.nrp}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => bukaModalEdit(personel)} 
                        style={{ padding: '0.4rem 0.8rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition:'0.2s' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleHapus(personel.id)} 
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

      {/* TAMPILAN POP-UP (MODAL) EDIT */}
      {isModalEditBuka && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000, padding: '1rem' 
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#001f3f', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>Edit Data Personel</h3>
            
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>Foto Saat Ini</label>
              <div style={{ marginBottom: '10px' }}>
                {fotoFileEdit ? (
                  <img src={URL.createObjectURL(fotoFileEdit)} alt="Preview Baru" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: '2px solid #10b981' }} />
                ) : dataEdit.foto_url ? (
                  <img src={dataEdit.foto_url} alt="Foto Lama" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: '2px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>No Pic</div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFotoEditChange} 
                className="modern-input"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '0.5rem' }}
              />
              <small style={{ color: '#6b7280', display: 'block', marginTop: '6px' }}>*Kosongkan jika tidak ingin mengubah foto</small>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>Nama Lengkap</label>
              <input 
                className="modern-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={dataEdit.nama}
                onChange={(e) => setDataEdit({...dataEdit, nama: e.target.value})}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>Pangkat</label>
              <input 
                className="modern-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={dataEdit.pangkat}
                onChange={(e) => setDataEdit({...dataEdit, pangkat: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>NRP / NIP</label>
              <input 
                className="modern-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={dataEdit.nrp}
                onChange={(e) => setDataEdit({...dataEdit, nrp: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsModalEditBuka(false)}
                className="btn-primary"
                style={{ background: '#e2e8f0', color: '#475569', padding: '0.7rem 1.2rem', boxShadow: 'none' }}
              >
                Batal
              </button>
              <button 
                onClick={simpanPerubahanEdit}
                disabled={loadingEdit}
                className="btn-primary"
                style={{ background: '#10b981', padding: '0.7rem 1.2rem' }}
              >
                {loadingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
