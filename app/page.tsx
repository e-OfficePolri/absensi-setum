'use client';

import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'; 
import * as XLSX from 'xlsx'; // Mengimpor pustaka untuk membuat file Excel

export default function Home() {
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  const [filterTanggal, setFilterTanggal] = useState('');

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

  const handleAbsen = async () => {
    if (!nama) {
      alert('Mohon masukkan nama atau NRP terlebih dahulu!');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'absensi_harian'), {
        nama_pegawai: nama,
        waktu_masuk: new Date().toISOString(),
      });
      setStatus(`Berhasil absen untuk: ${nama}!`);
      setNama(''); 
    } catch (error) {
      setStatus('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    if (!filterTanggal) return true;
    return absen.waktu_masuk?.split('T')[0] === filterTanggal;
  });

  // FUNGSI BARU: Mengunduh data langsung ke format .xlsx (Excel)
  const unduhExcel = () => {
    // 1. Menyiapkan data yang akan dimasukkan ke dalam Excel
    const dataExcel = daftarAbsenTerfilter.map((absen) => ({
      "Nama Pegawai": absen.nama_pegawai,
      "Tanggal & Waktu Masuk": absen.waktu_masuk 
        ? new Date(absen.waktu_masuk).toLocaleString('id-ID') 
        : '-'
    }));

    // 2. Membuat lembar kerja (Worksheet) dari data array
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);

    // 3. Membuat buku kerja (Workbook) dan memasukkan worksheet ke dalamnya
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");

    // 4. Memerintahkan browser untuk mengunduh file dengan ekstensi .xlsx
    XLSX.writeFile(workbook, "Laporan_Absensi_Setum.xlsx");
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Absensi Setum Polri</h1>
      
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
        style={{ padding: '0.8rem 1.5rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'Menyimpan...' : 'Absen Masuk'}
      </button>

      <div style={{ marginTop: '2.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', maxWidth: '600px', border: '1px solid #ddd' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Filter Tanggal:</label>
        <input 
          type="date" 
          value={filterTanggal} 
          onChange={(e) => setFilterTanggal(e.target.value)} 
          style={{ padding: '0.6rem', width: '100%', maxWidth: '200px', borderRadius: '5px', border: '1px solid #ccc' }} 
        />
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '600px' }}>
        <h2>Daftar Kehadiran</h2>
        <button 
          onClick={unduhExcel} 
          style={{ padding: '0.6rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Unduh .xlsx (Excel)
        </button>
      </div>
      
      <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px' }}>Nama</th>
              <th style={{ padding: '12px' }}>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {daftarAbsenTerfilter.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                  Tidak ada data absensi.
                </td>
              </tr>
            ) : (
              daftarAbsenTerfilter.map((absen) => (
                <tr key={absen.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{absen.nama_pegawai}</td>
                  <td style={{ padding: '12px' }}>
                    {absen.waktu_masuk 
                      ? new Date(absen.waktu_masuk).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })
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

