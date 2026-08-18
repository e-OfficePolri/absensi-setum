'use client';

import { useState, useEffect } from 'react';
import { db, auth } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
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
  
  // --- STATE BARU: Menyimpan daftar pegawai dari database ---
  const [daftarPegawai, setDaftarPegawai] = useState<any[]>([]);

  const [filterTanggal, setFilterTanggal] = useState('');
  const [kataKunci, setKataKunci] = useState('');
  
  const [halamanSaatIni, setHalamanSaatIni] = useState(1);
  const barisPerHalaman = 10;

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

  // 1. Mengambil data absensi harian
  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarAbsen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      // FITUR BARU: Mengabaikan error permission-denied saat sedang proses logout
      console.log("Info: Sesi berakhir, menghentikan penarikan data absen.");
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  // 2. Mengambil daftar pegawai resmi dari database
  useEffect(() => {
    if (isCheckingAuth) return;
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribePegawai = onSnapshot(q, (snapshot) => {
      setDaftarPegawai(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      // FITUR BARU: Mengabaikan error permission-denied saat sedang proses logout
      console.log("Info: Sesi berakhir, menghentikan penarikan data pegawai.");
    });
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
      label: 'Jumlah Anggota Hadir',
      data: jumlahHadir,
      backgroundColor: '#f1c40f',
      borderColor: '#001f3f',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const opsiChart = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Tren Kehadiran (7 Hari Terakhir)' },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    const cocokTanggal = !filterTanggal || (absen.waktu_masuk?.split('T')[0] === filterTanggal);
    const cocokNama = !kataKunci || absen.nama_pegawai.toLowerCase().includes(kataKunci.toLowerCase());
    return cocokTanggal && cocokNama;
  });

  const indexTerakhir = halamanSaatIni * barisPerHalaman;
  const indexPertama = indexTerakhir - barisPerHalaman;
  const dataTampil = daftarAbsenTerfilter.slice(indexPertama, indexTerakhir);
  const totalHalaman = Math.ceil(daftarAbsenTerfilter.length / barisPerHalaman);

  useEffect(() => { setHalamanSaatIni(1); }, [filterTanggal, kataKunci]);

  const handleLogout = async () => { await signOut(auth); router.push('/login'); };

  const handleAbsen = async () => {
    const jamSekarang = new Date().getHours();
    if (jamSekarang < 4 || jamSekarang >= 8) {
      toast.error('Absen hanya dibuka pukul 04:00 - 08:00');
      return;
    }

    if (!nama) { toast.error('Mohon pilih nama Anda dari daftar!'); return; }
    
    const sudahAbsen = daftarAbsen.some((a) => a.nama_pegawai === nama && a.waktu_masuk.split('T')[0] === new Date().toISOString().split('T')[0]);
    if (sudahAbsen) { toast.error('Sudah absen hari ini!'); return; }

    setLoading(true);
    let loadingToast;

    try {
      if (statusKehadiran === 'Hadir' || statusKehadiran === 'Dinas Luar') {
        loadingToast = toast.loading('Memeriksa lokasi GPS Anda...');
        
        const posisi = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) reject(new Error('GPS tidak didukung.'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });

        const KANTOR_LAT = -6.238934;  
        const KANTOR_LON = 106.803024; 
        const BATAS_JARAK_METER = 200; 

        const jarak = hitungJarakMeter(posisi.coords.latitude, posisi.coords.longitude, KANTOR_LAT, KANTOR_LON);

        if (jarak > BATAS_JARAK_METER) {
          toast.dismiss(loadingToast);
          toast.error(`Anda terlalu jauh! Jarak Anda: ${Math.round(jarak)} meter dari titik absen.`);
          setLoading(false);
          return;
        }
        toast.loading('Lokasi terkonfirmasi. Menyimpan data...', { id: loadingToast });
      } else {
        loadingToast = toast.loading('Menyimpan keterangan absen...');
      }
      
      await addDoc(collection(db, 'absensi_harian'), { 
        nama_pegawai: nama, 
        status_kehadiran: statusKehadiran,
        waktu_masuk: new Date().toISOString() 
      });
      
      toast.dismiss(loadingToast);
      toast.success(`Berhasil mencatat status: ${statusKehadiran}`); 
      setNama('');
      setStatusKehadiran('Hadir'); 
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Gagal memproses absensi.');
    } finally {
      setLoading(false);
    }
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
      "Waktu": new Date(a.waktu_masuk).toLocaleString('id-ID')
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, "Laporan.xlsx");
  };

  const unduhPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, { 
      head: [['Nama Pegawai', 'Status', 'Waktu']], 
      body: daftarAbsenTerfilter.map(a => [a.nama_pegawai, a.status_kehadiran || 'Hadir', new Date(a.waktu_masuk).toLocaleString('id-ID')]) 
    });
    doc.save("Laporan.pdf");
  };

  if (isCheckingAuth) return <div style={{ padding: '2rem', textAlign: 'center' }}>Memeriksa keamanan...</div>;

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <Toaster position="top-center" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#001f3f' }}>Absensi Setum Polri</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0, color: '#001f3f', fontSize: '1.2rem' }}>Dashboard Statistik</h2>
            {/* TOMBOL NAVIGASI MENUJU HALAMAN PEGAWAI */}
            <button 
              onClick={() => router.push('/pegawai')} 
              style={{ padding: '0.5rem 1rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⚙️ Kelola Data Pegawai
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '150px', background: '#001f3f', color: 'white', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Hadir Hari Ini</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kehadiranHariIni}</div>
            </div>
            <div style={{ flex: 1, minWidth: '150px', background: '#f1c40f', color: '#001f3f', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Data Absen</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{daftarAbsen.length}</div>
            </div>
          </div>

          <div style={{ width: '100%', height: '250px' }}>
            <Bar data={dataChart} options={opsiChart} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* --- PERUBAHAN UTAMA: MENGGANTI INPUT MENJADI SELECT DROPDOWN --- */}
        <select 
          value={nama} 
          onChange={(e) => setNama(e.target.value)} 
          style={{ padding: '0.8rem', flex: 1, minWidth: '200px', borderRadius: '5px', border: '1px solid #ccc', background: 'white' }} 
        >
          <option value="" disabled>-- Pilih Nama Pegawai --</option>
          {daftarPegawai.map((pegawai) => (
            <option key={pegawai.id} value={pegawai.nama}>
              {pegawai.nama} - {pegawai.nrp}
            </option>
          ))}
        </select>

        <select 
          value={statusKehadiran} 
          onChange={(e) => setStatusKehadiran(e.target.value)} 
          style={{ padding: '0.8rem', borderRadius: '5px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}
        >
          <option value="Hadir">✔️ Hadir</option>
          <option value="Sakit">💊 Sakit</option>
          <option value="Izin">📄 Izin</option>
          <option value="Dinas Luar">🚗 Dinas Luar</option>
        </select>
        
        <button 
          onClick={handleAbsen} 
          disabled={loading} 
          style={{ padding: '0.8rem 1.5rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Memproses...' : 'Absen'}
        </button>
      </div>

      <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '15px', flexWrap: 'wrap', border: '1px solid #ddd' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>Filter Tanggal:</label>
          <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>Cari Nama:</label>
          <input placeholder="Ketik nama untuk mencari..." value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
          <button onClick={unduhExcel} style={{ padding: '0.6rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Unduh Excel</button>
          <button onClick={unduhPDF} style={{ padding: '0.6rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Unduh PDF</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Nama</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Waktu</th>
              {isAdmin && <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {dataTampil.map((a) => (
              <tr key={a.id}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{a.nama_pegawai}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', color: a.status_kehadiran === 'Sakit' ? '#dc3545' : a.status_kehadiran === 'Izin' ? '#fd7e14' : a.status_kehadiran === 'Dinas Luar' ? '#0dcaf0' : '#28a745' }}>
                  {a.status_kehadiran || 'Hadir'}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(a.waktu_masuk).toLocaleString('id-ID')}</td>
                {isAdmin && <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(a.id, a.nama_pegawai)} style={{ padding: '0.3rem 0.6rem', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Edit</button>
                    <button onClick={() => handleHapus(a.id)} style={{ padding: '0.3rem 0.6rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus</button>
                  </div>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button disabled={halamanSaatIni === 1} onClick={() => setHalamanSaatIni(halamanSaatIni - 1)} style={{ padding: '0.5rem 1rem', background: '#f1f1f1', border: '1px solid #ccc', borderRadius: '4px' }}>Sebelumnya</button>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Halaman {halamanSaatIni} dari {totalHalaman || 1}</span>
        <button disabled={halamanSaatIni >= totalHalaman} onClick={() => setHalamanSaatIni(halamanSaatIni + 1)} style={{ padding: '0.5rem 1rem', background: '#f1f1f1', border: '1px solid #ccc', borderRadius: '4px' }}>Selanjutnya</button>
      </div>
    </main>
  );
}
