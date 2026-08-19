'use client';

import { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
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
import { useLaporan } from './hooks/useLaporan';

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

  const { unduhExcel, unduhPDF } = useLaporan(daftarAbsenTerfilter);

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

  const butuhKamera = (!absenPegawaiHariIni && (statusKehadiran === 'Hadir' || statusKehadiran === 'Dinas Luar')) || (absenPegawaiHariIni && !absenPegawaiHariIni.waktu_pulang);

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa keamanan...</div>;

  return (
    <main>
      <Toaster position="top-center" />
      
      {/* Header Area menggunakan class CSS baru */}
      <div className="header-container">
        <div className="logo-wrapper">
          <div className="logo-icon">🏢</div>
          <h1 className="page-title">e-Absensi Setum Polri</h1>
        </div>
        <button onClick={handleLogout} className="btn-danger">
          Logout
        </button>
      </div>

      <DashboardAdmin 
        isAdmin={isAdmin}
        kehadiranHariIni={kehadiranHariIni}
        totalDataAbsen={daftarAbsen.length}
        dataChart={dataChart}
        opsiChart={opsiChart}
      />

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
        handleAbsen={() => handleAbsen(absenPegawaiHariIni, tanggalHariIni)}
        tombolDisable={tombolDisable}
        loading={loading}
        teksTombol={teksTombol}
        warnaTombol={warnaTombol}
      />

      {/* Area Filter menggunakan class CSS baru */}
      <div className="filter-container">
        <div>
          <label className="filter-label">Filter Bulan</label>
          <input 
            type="month" 
            className="modern-input" 
            value={filterBulan} 
            onChange={(e) => { setFilterBulan(e.target.value); setFilterTanggal(''); }} 
            style={{ width: '150px' }} 
          />
        </div>
        <div>
          <label className="filter-label">Filter Tanggal</label>
          <input 
            type="date" 
            className="modern-input" 
            value={filterTanggal} 
            onChange={(e) => { setFilterTanggal(e.target.value); setFilterBulan(''); }} 
            style={{ width: '140px' }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label className="filter-label">Cari Nama Pegawai</label>
          <input 
            placeholder="Ketik nama di sini..." 
            className="modern-input" 
            value={kataKunci} 
            onChange={(e) => setKataKunci(e.target.value)} 
            style={{ width: '100%', boxSizing: 'border-box' }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            onClick={() => { setFilterBulan(''); setFilterTanggal(''); setKataKunci(''); }} 
            className="btn-secondary"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="export-container">
          <button onClick={unduhExcel} className="btn-success">
            <span>📊</span> Unduh Excel
          </button>
          <button onClick={unduhPDF} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📑</span> Unduh PDF
          </button>
        </div>
      )}

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
