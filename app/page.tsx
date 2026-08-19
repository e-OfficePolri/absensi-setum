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
import FilterAbsensi from './components/FilterAbsensi';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

export default function Home() {
  const router = useRouter();
  const { isCheckingAuth, isAdmin, handleLogout } = useAuth();
  
  // KITA UBAH DI SINI: Menggunakan alias daftarPersonel dari daftarPegawai bawaan hook
  const {
    nama, setNama, statusKehadiran, setStatusKehadiran,
    loading, daftarAbsen, daftarPegawai: daftarPersonel,
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
    // Catatan: absen.nama_pegawai tetap digunakan jika itu adalah nama field di database Anda
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
  
  // KITA UBAH DI SINI: Variabel absenPegawaiHariIni menjadi absenPersonelHariIni
  const absenPersonelHariIni = daftarAbsen.find((a) => a.nama_pegawai === nama && a.waktu_masuk?.startsWith(tanggalHariIni));
  
  let teksTombol = 'Absen Masuk';
  let tombolDisable = loading;
  let warnaTombol = '#001f3f'; 

  if (absenPersonelHariIni) {
    if (absenPersonelHariIni.waktu_pulang) {
      teksTombol = 'Selesai (Sudah Absen)';
      tombolDisable = true;
      warnaTombol = '#6c757d'; 
    } else {
      teksTombol = 'Absen Pulang';
      warnaTombol = '#dc3545'; 
    }
  }

  const butuhKamera = (!absenPersonelHariIni && (statusKehadiran === 'Hadir' || statusKehadiran === 'Dinas Luar')) || (absenPersonelHariIni && !absenPersonelHariIni.waktu_pulang);

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>Memeriksa keamanan...</div>;

  return (
    <main>
      <Toaster position="top-center" />
      
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
        // KITA UBAH DI SINI: Tetap mengirimkan properti dengan nama yang diminta komponen anak, tapi nilainya dari variabel baru
        daftarPegawai={daftarPersonel}
        absenPegawaiHariIni={absenPersonelHariIni}
        statusKehadiran={statusKehadiran}
        setStatusKehadiran={setStatusKehadiran}
        handleAbsen={() => handleAbsen(absenPersonelHariIni, tanggalHariIni)}
        tombolDisable={tombolDisable}
        loading={loading}
        teksTombol={teksTombol}
        warnaTombol={warnaTombol}
      />

      <FilterAbsensi 
         filterBulan={filterBulan}
         setFilterBulan={setFilterBulan}
         filterTanggal={filterTanggal}
         setFilterTanggal={setFilterTanggal}
         kataKunci={kataKunci}
         setKataKunci={setKataKunci}
       />

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
