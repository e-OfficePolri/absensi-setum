'use client';

import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'; 

export default function Home() {
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  
  // State baru untuk menyimpan tanggal yang dipilih untuk filter (format: YYYY-MM-DD)
  const [filterTanggal, setFilterTanggal] = useState('');

  // Mengambil data dari Firebase secara real-time
  useEffect(() => {
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dataDariDatabase = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDaftarAbsen(dataDariDatabase);
    });

    return () => unsubscribe();
  }, []);

  // Fungsi untuk menyimpan absen baru
  const handleAbsen = async () => {
    if (!nama) {
      alert('Mohon masukkan nama atau NRP terlebih dahulu!');
      return;
    }
    
    setLoading(true);
    setStatus('Sedang menyimpan data...');

    try {
      await addDoc(collection(db, 'absensi_harian'), {
        nama_pegawai: nama,
        waktu_masuk: new Date().toISOString(), // Menyimpan waktu saat ini
      });
      
      setStatus(`Berhasil absen untuk: ${nama}!`);
      setNama(''); 
    } catch (error) {
      console.error(error);
      setStatus('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  // Logika untuk memfilter data berdasarkan tanggal yang dipilih
  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    if (!filterTanggal) return true; // Jika tidak ada filter tanggal, tampilkan semua
    
    // Ambil bagian tanggal saja dari data database (Format YYYY-MM-DD)
    const tanggalAbsen = absen.waktu_masuk ? absen.waktu_masuk.split('T')[0] : '';
    return tanggalAbsen === filterTanggal;
  });

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Absensi Setum Polri</h1>
      
      {/* Bagian Input Absen */}
      <div style={{ margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Masukkan Nama/NRP"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          disabled={loading}
          style={{ padding: '0.8rem', width: '100%', maxWidth: '300px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
      </div>
      
      <button 
        onClick={handleAbsen}
        disabled={loading}
        style={{ 
          padding: '0.8rem 1.5rem', 
          background: loading ? '#666' : '#001f3f', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Menyimpan...' : 'Absen Masuk'}
      </button>
      
      <p style={{ marginTop: '1.5rem', fontWeight: 'bold', color: status.includes('Gagal') ? 'red' : 'green' }}>
        {status}
      </p>

      {/* Bagian Filter Tanggal */}
      <div style={{ marginTop: '2.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', maxWidth: '600px', border: '1px solid #ddd' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5_rem', fontSize: '0.9rem' }}>
          Filter Berdasarkan Tanggal:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '5px', border: '1px solid #ccc', flex: 1 }}
          />
          {filterTanggal && (
            <button
              onClick={() => setFilterTanggal('')}
              style={{ padding: '0.6rem 1rem', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bagian Tabel Daftar Kehadiran */}
      <h2 style={{ marginTop: '2rem', fontSize: '1.5rem' }}>Daftar Kehadiran</h2>
      
      <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px' }}>Nama Pegawai</th>
              <th style={{ padding: '12px' }}>Tanggal & Waktu</th>
            </tr>
          </thead>
          <tbody>
            {daftarAbsenTerfilter.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                  Tidak ada data absensi untuk tanggal ini.
                </td>
              </tr>
            ) : (
              daftarAbsenTerfilter.map((absen) => (
                <tr key={absen.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{absen.nama_pegawai}</td>
                  <td style={{ padding: '12px' }}>
                    {absen.waktu_masuk 
                      ? new Date(absen.waktu_masuk).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'medium'
                        })
                      : '-'}
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
