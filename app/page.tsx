'use client';

import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'; 
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Home() {
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  const [filterTanggal, setFilterTanggal] = useState('');

  // Mengambil data dari Firebase secara real-time
  useEffect(() => {
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDaftarAbsen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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
    setStatus('Sedang menyimpan...');
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

  // Filter data berdasarkan tanggal yang dipilih
  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    if (!filterTanggal) return true;
    return absen.waktu_masuk?.split('T')[0] === filterTanggal;
  });

  // Fungsi Unduh Excel (.xlsx)
  const unduhExcel = () => {
    const dataExcel = daftarAbsenTerfilter.map((absen) => ({
      "Nama Pegawai": absen.nama_pegawai,
      "Tanggal & Waktu Masuk": new Date(absen.waktu_masuk).toLocaleString('id-ID')
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
    XLSX.writeFile(workbook, "Laporan_Absensi_Setum.xlsx");
  };

  // Fungsi Unduh PDF
  const unduhPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Absensi Setum Polri", 14, 15);
    const tableData = daftarAbsenTerfilter.map(absen => [
      absen.nama_pegawai,
      new Date(absen.waktu_masuk).toLocaleString('id-ID')
    ]);
    autoTable(doc, {
      head: [['Nama Pegawai', 'Tanggal & Waktu']],
      body: tableData,
      startY: 20,
    });
    doc.save("Laporan_Absensi_Setum.pdf");
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Absensi Setum Polri</h1>
      
      {/* Input Absen */}
      <div style={{ margin: '1rem 0' }}>
        <input 
          type="text" placeholder="Masukkan Nama/NRP" value={nama} 
          onChange={(e) => setNama(e.target.value)} disabled={loading} 
          style={{ padding: '0.8rem', width: '100%', maxWidth: '300px', borderRadius: '5px', border: '1px solid #ccc' }} 
        />
        <button 
          onClick={handleAbsen} disabled={loading} 
          style={{ marginLeft: '10px', padding: '0.8rem 1.5rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? '...' : 'Absen'}
        </button>
      </div>

      {/* Filter Tanggal */}
      <div style={{ marginTop: '2rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', maxWidth: '600px' }}>
        <label>Filter Tanggal:</label>
        <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} style={{ marginLeft: '10px', padding: '0.5rem' }} />
      </div>

      {/* Tombol Unduh */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '10px' }}>
        <button onClick={unduhExcel} style={{ padding: '0.6rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Unduh Excel (.xlsx)</button>
        <button onClick={unduhPDF} style={{ padding: '0.6rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Unduh PDF</button>
      </div>
      
      {/* Tabel */}
      <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nama</th>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Waktu</th>
          </tr>
        </thead>
        <tbody>
          {daftarAbsenTerfilter.map((absen) => (
            <tr key={absen.id}>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{absen.nama_pegawai}</td>
              <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(absen.waktu_masuk).toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

