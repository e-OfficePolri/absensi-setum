'use client';

import { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
import Webcam from 'react-webcam';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import TabelAbsensi from './components/TabelAbsensi';
import FormAbsensi from './components/FormAbsensi';
import DashboardAdmin from './components/DashboardAdmin';
import { hitungJarakMeter } from './utils/helper';
import { useAuth } from './hooks/useAuth';
import { useAbsensi } from './hooks/useAbsensi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

export default function Home() {
  const router = useRouter();
  const { isCheckingAuth, isAdmin, handleLogout } = useAuth();
  const {
    nama, setNama, statusKehadiran, setStatusKehadiran,
    loading, daftarAbsen, daftarPegawai,
    kameraTerbuka, setKameraTerbuka, webcamRef,
    handleAbsen, handleEdit, handleHapus
  } = useAbsensi(isCheckingAuth);

  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [kataKunci, setKataKunci] = useState('');
   
  const [halamanSaatIni, setHalamanSaatIni] = useState(1);
  const barisPerHalaman = 10;

  const hitungStatistik = () => { 
    const dataGrafik: { [key: string]: number } = {};
    let kehadiranHariIni = 0;
    const tanggalHariIni = new Date().toISOString().split('T')[0];

    daftarAbsen.forEach((absen) => {
      const tanggal = absen.waktu_masuk?.split('T')[0];
      if (tanggal) {
        const isHadir = !absen.status_kehadiran || absen.status_kehadiran === 'Hadir';
        if (isHadir) {
          if (tanggal === tanggalHariIni) kehadiranHariIni += 1;
          dataGrafik[tanggal] = (dataGrafik[tanggal] || 0) + 1;
        }
      }
    });
    const labelTanggal = Object.keys(dataGrafik).sort().slice(-7);
    const jumlahHadir = labelTanggal.map(tgl => dataGrafik[tgl]);
    return { kehadiranHariIni, labelTanggal, jumlahHadir };
  };

  const { kehadiranHariIni, labelTanggal, jumlahHadir } = hitungStatistik();

  const dataChart = {
    labels: labelTanggal,
    datasets: [{
      label: 'Jumlah Hadir', data: jumlahHadir, backgroundColor: '#f1c40f', borderColor: '#001f3f', borderWidth: 1, borderRadius: 4,
    }],
  };
  const opsiChart = { responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: 'Tren 7 Hari' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    const absenTanggal = absen.waktu_masuk?.split('T')[0];
    const absenBulan = absen.waktu_masuk?.substring(0, 7); 
    const cocokTanggal = !filterTanggal || (absenTanggal === filterTanggal);
    const cocokBulan = !filterBulan || (absenBulan === filterBulan);
    const cocokNama = !kataKunci || absen.nama_pegawai.toLowerCase().includes(kataKunci.toLowerCase());
    return cocokTanggal && cocokBulan && cocokNama;
  });

  const indexTerakhir = halamanSaatIni * barisPerHalaman;
  const indexPertama = indexTerakhir - barisPerHalaman;
  const dataTampil = daftarAbsenTerfilter.slice(indexPertama, indexTerakhir);
  const totalHalaman = Math.ceil(daftarAbsenTerfilter.length / barisPerHalaman);
  useEffect(() => { setHalamanSaatIni(1); }, [filterTanggal, filterBulan, kataKunci]);

  const tanggalHariIni = new Date().toISOString().split('T')[0];
  const absenPegawaiHariIni = daftarAbsen.find((a) => a.nama_pegawai === nama && a.waktu_masuk?.startsWith(tanggalHariIni));
  
  let teksTombol = 'Absen Masuk';
  let tombolDisable = loading;
  let warnaTombol = '#001f3f'; 

  if (absenPegawaiHariIni) {
    if (absenPegawaiHariIni.waktu_pulang) {
      teksTombol = 'Selesai (Sudah Absen)';
      tombolDisable = true;
      warnaTombol = '#6c757d'; 
    } else {
      teksTombol = 'Absen Pulang';
      warnaTombol = '#dc3545'; 
    }
  }

  const unduhExcel = () => {
    const ws = XLSX.utils.json_to_sheet(daftarAbsenTerfilter.map(a => ({
      "Nama Pegawai": a.nama_pegawai, 
      "Status": a.status_kehadiran || 'Hadir', 
      "Waktu Masuk": new Date(a.waktu_masuk).toLocaleString('id-ID'),
      "Waktu Pulang": a.waktu_pulang ? new Date(a.waktu_pulang).toLocaleString('id-ID') : 'Belum Pulang'
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, "Laporan.xlsx");
  };

  const unduhPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, { 
      head: [['Nama Pegawai', 'Status', 'Masuk', 'Pulang']], 
      body: daftarAbsenTerfilter.map(a => [
        a.nama_pegawai, 
        a.status_kehadiran || 'Hadir', 
        new Date(a.waktu_masuk).toLocaleTimeString('id-ID'),
        a.waktu_pulang ? new Date(a.waktu_pulang).toLocaleTimeString('id-ID') : '-'
      ]) 
    });
    doc.save("Laporan.pdf");
  };

  const butuhKamera = (!absenPegawaiHariIni && (statusKehadiran === 'Hadir' || statusKehadiran === 'Dinas Luar')) || (absenPegawaiHariIni && !absenPegawaiHariIni.waktu_pulang);

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa keamanan...</div>;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      {/* CSS Tambahan untuk efek Hover pada Tabel */}
      <style dangerouslySetInnerHTML={{__html: `
        .table-row:hover { background-color: #f1f8ff; transition: 0.3s; }
        .modern-input:focus { outline: 2px solid #001f3f; border-color: transparent; }
      `}} />
      
      <Toaster position="top-center" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '3px solid #001f3f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', backgroundColor: '#f1c40f', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '1.5rem' }}>🏢</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#001f3f', fontWeight: '800', letterSpacing: '-0.5px' }}>e-Absensi Setum Polri</h1>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.6rem 1.2rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)' }}>Logout</button>
      </div>

      {/* Dashboard Statistik Admin yang sudah dirapikan */}
      <DashboardAdmin 
        isAdmin={isAdmin}
        kehadiranHariIni={kehadiranHariIni}
        totalDataAbsen={daftarAbsen.length}
        dataChart={dataChart}
        opsiChart={opsiChart}
      />

      {/* Area Absen (Kamera & Input) yang sudah dirapikan */}
      <FormAbsensi
        butuhKamera={butuhKamera}
        kameraTerbuka={kameraTerbuka}
        setKameraTerbuka={setKameraTerbuka}
        webcamRef={webcamRef}
        nama={nama}
        setNama={setNama}
        daftarPegawai={daftarPegawai}
        absenPegawaiHariIni={absenPegawaiHariIni}
        statusKehadiran={statusKehadiran}
        setStatusKehadiran={setStatusKehadiran}
        handleAbsen={handleAbsen}
        tombolDisable={tombolDisable}
        loading={loading}
        teksTombol={teksTombol}
        warnaTombol={warnaTombol}
      />

      {/* Filter dan Pencarian Data */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '15px', flexWrap: 'wrap', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#555' }}>Filter Bulan</label>
          <input type="month" className="modern-input" value={filterBulan} onChange={(e) => { setFilterBulan(e.target.value); setFilterTanggal(''); }} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #d1d5db', width: '150px' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#555' }}>Filter Tanggal</label>
          <input type="date" className="modern-input" value={filterTanggal} onChange={(e) => { setFilterTanggal(e.target.value); setFilterBulan(''); }} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #d1d5db', width: '140px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '700', color: '#555' }}>Cari Nama Pegawai</label>
          <input placeholder="Ketik nama di sini..." className="modern-input" value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={() => { setFilterBulan(''); setFilterTanggal(''); setKataKunci(''); }} style={{ padding: '0.7rem 1.2rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '42px', transition: '0.2s' }}>Reset Filter</button>
        </div>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={unduhExcel} style={{ padding: '0.7rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}><span>📊</span> Unduh Excel</button>
          <button onClick={unduhPDF} style={{ padding: '0.7rem 1.2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}><span>📑</span> Unduh PDF</button>
        </div>
      )}

      {/* Memanggil komponen Tabel yang sudah kita rapikan */}
      <TabelAbsensi 
        dataTampil={dataTampil}
        isAdmin={isAdmin}
        handleEdit={handleEdit}
        handleHapus={handleHapus}
        halamanSaatIni={halamanSaatIni}
        totalHalaman={totalHalaman}
        setHalamanSaatIni={setHalamanSaatIni}
      />
    </main>
  );
}
