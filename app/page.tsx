'use client';

import { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
import Webcam from 'react-webcam';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const hitungJarakMeter = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function Home() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); 
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [statusKehadiran, setStatusKehadiran] = useState('Hadir');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  const [daftarPegawai, setDaftarPegawai] = useState<any[]>([]);

  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [kataKunci, setKataKunci] = useState('');
  const [kameraTerbuka, setKameraTerbuka] = useState(false);
  
  const [halamanSaatIni, setHalamanSaatIni] = useState(1);
  const barisPerHalaman = 10;

  const webcamRef = useRef<Webcam>(null);
  const EMAIL_ADMIN = "98010786@polri.go.id";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(user.email === EMAIL_ADMIN);
        setIsCheckingAuth(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarAbsen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, () => console.log("Info: Sesi berakhir."));
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  useEffect(() => {
    if (isCheckingAuth) return;
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribePegawai = onSnapshot(q, (snapshot) => {
      setDaftarPegawai(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, () => console.log("Info: Sesi berakhir."));
    return () => unsubscribePegawai();
  }, [isCheckingAuth]);

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

  const handleLogout = async () => { await signOut(auth); router.push('/login'); };

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

  const handleAbsen = async () => {
    if (!nama) { toast.error('Mohon pilih nama Anda!'); return; }
    const jamSekarang = new Date().getHours();
    setLoading(true);
    let loadingToast;

    try {
      if (absenPegawaiHariIni && !absenPegawaiHariIni.waktu_pulang) {
        if (jamSekarang < 15 || jamSekarang >= 18) {
          toast.error('Absen Pulang hanya pukul 15:00 - 18:00'); setLoading(false); return;
        }

        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
          toast.error('Gagal mengambil foto. Pastikan kamera menyala.'); setLoading(false); return;
        }

        loadingToast = toast.loading('Memeriksa lokasi GPS...');
        const posisi = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) reject(new Error('GPS tidak didukung.'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });

        const jarak = hitungJarakMeter(posisi.coords.latitude, posisi.coords.longitude, -6.238934, 106.803024);
        if (jarak > 200) {
          toast.dismiss(loadingToast); toast.error(`Terlalu jauh! Jarak Anda: ${Math.round(jarak)}m.`); setLoading(false); return;
        }

        toast.loading('Mengunggah foto selfie pulang...', { id: loadingToast });
        const namaFile = `absensi/pulang_${tanggalHariIni}_${nama.replace(/\s+/g, '_')}.jpg`;
        const storageRef = ref(storage, namaFile);
        await uploadString(storageRef, imageSrc, 'data_url');
        const fotoUrl = await getDownloadURL(storageRef);
        
        toast.loading('Menyimpan Absen Pulang...', { id: loadingToast });
        await updateDoc(doc(db, 'absensi_harian', absenPegawaiHariIni.id), {
          waktu_pulang: new Date().toISOString(),
          foto_pulang: fotoUrl
        });
        toast.dismiss(loadingToast); toast.success(`Hati-hati di jalan, ${nama}!`); 
      } 
      else {
        if (jamSekarang < 4 || jamSekarang >= 8) {
          toast.error('Absen Masuk hanya pukul 04:00 - 08:00'); setLoading(false); return;
        }

        let fotoUrl = null;

        if (statusKehadiran === 'Hadir' || statusKehadiran === 'Dinas Luar') {
          const imageSrc = webcamRef.current?.getScreenshot();
          if (!imageSrc) {
            toast.error('Gagal mengambil foto. Pastikan kamera menyala.'); setLoading(false); return;
          }

          loadingToast = toast.loading('Memeriksa lokasi GPS...');
          const posisi = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) reject(new Error('GPS tidak didukung.'));
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
          });

          const jarak = hitungJarakMeter(posisi.coords.latitude, posisi.coords.longitude, -6.238934, 106.803024);
          if (jarak > 200) {
            toast.dismiss(loadingToast); toast.error(`Terlalu jauh! Jarak Anda: ${Math.round(jarak)}m.`); setLoading(false); return;
          }

          toast.loading('Mengunggah foto selfie masuk...', { id: loadingToast });
          const namaFile = `absensi/masuk_${tanggalHariIni}_${nama.replace(/\s+/g, '_')}.jpg`;
          const storageRef = ref(storage, namaFile);
          await uploadString(storageRef, imageSrc, 'data_url');
          fotoUrl = await getDownloadURL(storageRef);

          toast.loading('Menyimpan data...', { id: loadingToast });
        } else {
          loadingToast = toast.loading('Menyimpan keterangan absen (Sakit/Izin)...');
        }
        
        await addDoc(collection(db, 'absensi_harian'), { 
          nama_pegawai: nama, 
          status_kehadiran: statusKehadiran,
          waktu_masuk: new Date().toISOString(),
          ...(fotoUrl && { foto_masuk: fotoUrl }) 
        });
        
        toast.dismiss(loadingToast); toast.success(`Berhasil mencatat: ${statusKehadiran}`); 
      }
      
      setNama(''); setStatusKehadiran('Hadir'); 
    } catch (error) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('Gagal memproses absensi.');
    } finally { setLoading(false); }
  };

  const handleEdit = async (id: string, namaLama: string) => {
    const namaBaru = window.prompt("Perbaiki nama/NRP:", namaLama);
    if (namaBaru && namaBaru !== namaLama) {
      await updateDoc(doc(db, 'absensi_harian', id), { nama_pegawai: namaBaru });
      toast.success('Data diperbarui!');
    }
  };

  const handleHapus = async (id: string) => {
    if (window.confirm("Yakin ingin menghapus?")) {
      await deleteDoc(doc(db, 'absensi_harian', id));
      toast.success('Data dihapus!');
    }
  };

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

      {isAdmin && (
        <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#001f3f', fontSize: '1.3rem', fontWeight: '700' }}>Dashboard Statistik</h2>
            <button onClick={() => router.push('/pegawai')} style={{ padding: '0.6rem 1.2rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(23, 162, 184, 0.3)' }}>⚙️ Kelola Pegawai</button>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '150px', background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,31,63,0.2)' }}>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '5px' }}>Hadir Hari Ini</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>{kehadiranHariIni}</div>
            </div>
            <div style={{ flex: 1, minWidth: '150px', background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)', color: '#001f3f', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(241,196,15,0.2)' }}>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '5px' }}>Total Data Absen</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>{daftarAbsen.length}</div>
            </div>
          </div>

          <div style={{ width: '100%', height: '250px' }}>
            <Bar data={dataChart} options={opsiChart} />
          </div>
        </div>
      )}

      {/* Area Absen (Kamera & Input) */}
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', marginBottom: '2.5rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#001f3f', fontSize: '1.3rem', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>Form Absensi</h2>
        
        {/* Jika butuh kamera, kita tampilkan pilihan untuk membuka kamera */}
        {butuhKamera && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #ccc' }}>
            
            {/* Cek apakah kamera sedang terbuka atau tertutup */}
            {!kameraTerbuka ? (
              <button 
                onClick={() => setKameraTerbuka(true)} 
                style={{ padding: '0.9rem 2rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                📷 Buka Kamera untuk Absen
              </button>
            ) : (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }} 
                  style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', border: '4px solid #001f3f', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
                />
                <p style={{ fontSize: '0.95rem', color: '#001f3f', marginTop: '12px', fontWeight: 'bold' }}>📸 Posisikan wajah Anda di dalam bingkai</p>
                <button 
                  onClick={() => setKameraTerbuka(false)} 
                  style={{ marginTop: '10px', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                >
                  ❌ Tutup Kamera
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <select className="modern-input" value={nama} onChange={(e) => setNama(e.target.value)} style={{ padding: '0.9rem', flex: 1, minWidth: '220px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontSize: '1rem', color: '#333' }}>
            <option value="" disabled>-- Pilih Nama Pegawai --</option>
            {daftarPegawai.map((pegawai) => (
              <option key={pegawai.id} value={pegawai.nama}>{pegawai.nama} - {pegawai.nrp}</option>
            ))}
          </select>

          {(!absenPegawaiHariIni || absenPegawaiHariIni.waktu_pulang) && (
            <select className="modern-input" value={statusKehadiran} onChange={(e) => setStatusKehadiran(e.target.value)} style={{ padding: '0.9rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontWeight: '600', fontSize: '1rem', color: '#333' }}>
              <option value="Hadir">✔️ Hadir</option>
              <option value="Sakit">💊 Sakit</option>
              <option value="Izin">📄 Izin</option>
              <option value="Dinas Luar">🚗 Dinas Luar</option>
            </select>
          )}
          
          <button onClick={handleAbsen} disabled={tombolDisable} style={{ padding: '0.9rem 2rem', background: warnaTombol, color: 'white', border: 'none', borderRadius: '8px', cursor: tombolDisable ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', minWidth: '160px', boxShadow: `0 4px 6px ${tombolDisable ? 'transparent' : 'rgba(0,0,0,0.1)'}`, transition: '0.2s' }}>
            {loading ? 'Memproses...' : teksTombol}
          </button>
        </div>
      </div>

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

      {/* Tabel Data Modern */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#001f3f', color: 'white' }}>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Nama Pegawai</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Masuk</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Pulang</th>
              <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Bukti Foto</th>
              {isAdmin && <th style={{ padding: '16px', fontWeight: '600', borderBottom: '2px solid #001f3f', textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {dataTampil.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>Belum ada data absensi yang sesuai filter.</td>
              </tr>
            ) : (
              dataTampil.map((a) => (
                <tr key={a.id} className="table-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px', color: '#111827', fontWeight: '500' }}>{a.nama_pegawai}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                      backgroundColor: a.status_kehadiran === 'Sakit' ? '#fee2e2' : a.status_kehadiran === 'Izin' ? '#ffedd5' : a.status_kehadiran === 'Dinas Luar' ? '#cffafe' : '#d1fae5',
                      color: a.status_kehadiran === 'Sakit' ? '#991b1b' : a.status_kehadiran === 'Izin' ? '#c2410c' : a.status_kehadiran === 'Dinas Luar' ? '#075985' : '#065f46'
                    }}>
                      {a.status_kehadiran || 'Hadir'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#4b5563' }}>{new Date(a.waktu_masuk).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#4b5563' }}>{a.waktu_pulang ? new Date(a.waktu_pulang).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : '-'}</td>
                  
                  <td style={{ padding: '16px', textAlign: 'center', fontSize: '0.9rem' }}>
                    {a.foto_masuk ? <a href={a.foto_masuk} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Masuk</a> : '-'}
                    {a.foto_pulang && <span> <span style={{color:'#ccc'}}>|</span> <a href={a.foto_pulang} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Pulang</a></span>}
                  </td>
                  
                  {isAdmin && <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(a.id, a.nama_pegawai)} style={{ padding: '0.4rem 0.8rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition:'0.2s' }}>Edit</button>
                      <button onClick={() => handleHapus(a.id)} style={{ padding: '0.4rem 0.8rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition:'0.2s' }}>Hapus</button>
                    </div>
                  </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        <button disabled={halamanSaatIni === 1} onClick={() => setHalamanSaatIni(halamanSaatIni - 1)} style={{ padding: '0.6rem 1.2rem', background: halamanSaatIni === 1 ? '#f3f4f6' : '#001f3f', color: halamanSaatIni === 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: halamanSaatIni === 1 ? 'not-allowed' : 'pointer' }}>&larr; Sebelumnya</button>
        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#4b5563' }}>Halaman {halamanSaatIni} dari {totalHalaman || 1}</span>
        <button disabled={halamanSaatIni >= totalHalaman} onClick={() => setHalamanSaatIni(halamanSaatIni + 1)} style={{ padding: '0.6rem 1.2rem', background: halamanSaatIni >= totalHalaman ? '#f3f4f6' : '#001f3f', color: halamanSaatIni >= totalHalaman ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: halamanSaatIni >= totalHalaman ? 'not-allowed' : 'pointer' }}>Selanjutnya &rarr;</button>
      </div>
    </main>
  );
}
