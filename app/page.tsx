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

export default function Home() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); 
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  
  // STATE PENCARIAN & FILTER
  const [filterTanggal, setFilterTanggal] = useState('');
  const [kataKunci, setKataKunci] = useState(''); // State baru untuk fitur pencarian

  // TENTUKAN EMAIL ADMIN DI SINI
  const EMAIL_ADMIN = "98010786@polri.go.id";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === EMAIL_ADMIN) {
          setIsAdmin(true); 
        } else {
          setIsAdmin(false); 
        }
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
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login'); 
  };

  const handleAbsen = async () => {
    if (!nama) {
      toast.error('Mohon masukkan nama atau NRP terlebih dahulu!');
      return;
    }

    const tanggalHariIni = new Date().toISOString().split('T')[0];
    const sudahAbsen = daftarAbsen.some((absen) => {
      const tanggalAbsen = absen.waktu_masuk ? absen.waktu_masuk.split('T')[0] : '';
      const namaSama = absen.nama_pegawai.toLowerCase() === nama.toLowerCase();
      const hariSama = tanggalAbsen === tanggalHariIni;
      return namaSama && hariSama;
    });

    if (sudahAbsen) {
      toast.error(`Maaf, "${nama}" sudah melakukan absensi hari ini!`);
      setNama(''); 
      return; 
    }

    setLoading(true);
    const loadingToast = toast.loading('Sedang menyimpan data...');
    
    try {
      await addDoc(collection(db, 'absensi_harian'), {
        nama_pegawai: nama,
        waktu_masuk: new Date().toISOString(),
      });
      toast.dismiss(loadingToast);
      toast.success(`Berhasil absen untuk: ${nama}!`);
      setNama(''); 
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string, namaLama: string) => {
    const namaBaru = window.prompt("Perbaiki nama/NRP:", namaLama);
    if (namaBaru !== null && namaBaru.trim() !== "") {
      if (namaBaru === namaLama) return;
      const loadingToast = toast.loading('Sedang memperbarui data...');
      try {
        const referensiDokumen = doc(db, 'absensi_harian', id);
        await updateDoc(referensiDokumen, {
          nama_pegawai: namaBaru
        });
        toast.dismiss(loadingToast);
        toast.success('Data absen berhasil diperbarui!');
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('Gagal memperbarui data.');
      }
    }
  };

  const handleHapus = async (id: string, namaPegawai: string) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus data absen atas nama ${namaPegawai}?`);
    if (konfirmasi) {
      try {
        await deleteDoc(doc(db, 'absensi_harian', id));
        toast.success('Data absen berhasil dihapus.');
      } catch (error) {
        toast.error('Gagal menghapus data.');
      }
    }
  };

  // --- LOGIKA FILTER & PENCARIAN YANG DIPERBARUI ---
  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    // 1. Cek kecocokan tanggal (jika filter tanggal diisi)
    const cocokTanggal = !filterTanggal || (absen.waktu_masuk?.split('T')[0] === filterTanggal);
    
    // 2. Cek kecocokan nama (jika kotak pencarian diisi)
    // toLowerCase() memastikan pencarian tidak mempedulikan huruf besar/kecil
    const cocokNama = !kataKunci || absen.nama_pegawai.toLowerCase().includes(kataKunci.toLowerCase());
    
    // Data hanya akan ditampilkan jika cocok dengan tanggal DAN cocok dengan kata kunci
    return cocokTanggal && cocokNama;
  });

  const unduhExcel = () => {
    const dataExcel = daftarAbsenTerfilter.map((absen) => ({
      "Nama Pegawai": absen.nama_pegawai,
      "Tanggal & Waktu Masuk": new Date(absen.waktu_masuk).toLocaleString('id-ID')
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Absensi");
    XLSX.writeFile(workbook, "Laporan_Absensi_Setum.xlsx");
    toast.success('File Excel berhasil diunduh!');
  };

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
    toast.success('File PDF berhasil diunduh!');
  };

  if (isCheckingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Memeriksa keamanan...</div>;
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <Toaster position="top-center" reverseOrder={false} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Absensi Setum Polri</h1>
        <button onClick={handleLogout} style={{ padding: '0.6rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
      
      <div style={{ margin: '1rem 0' }}>
        <input type="text" placeholder="Masukkan Nama/NRP" value={nama} onChange={(e) => setNama(e.target.value)} disabled={loading} style={{ padding: '0.8rem', width: '100%', maxWidth: '300px', borderRadius: '5px', border: '1px solid #ccc' }} />
        <button onClick={handleAbsen} disabled={loading} style={{ marginLeft: '10px', padding: '0.8rem 1.5rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? '...' : 'Absen'}
        </button>
      </div>

      {/* AREA PENCARIAN DAN FILTER (Diperbarui agar sejajar) */}
      <div style={{ marginTop: '2rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', maxWidth: '600px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Filter Tanggal:</label>
          <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} style={{ padding: '0.6rem', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Cari Nama:</label>
          <input 
            type="text" 
            placeholder="Ketik nama untuk mencari..." 
            value={kataKunci} 
            onChange={(e) => setKataKunci(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem', borderRadius: '5px', border: '1px solid #ccc' }} 
          />
        </div>
      </div>

      {isAdmin && (
        <div style={{ marginTop: '2rem', display: 'flex', gap: '10px' }}>
          <button onClick={unduhExcel} style={{ padding: '0.6rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Unduh Excel (.xlsx)</button>
          <button onClick={unduhPDF} style={{ padding: '0.6rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Unduh PDF</button>
        </div>
      )}
      
      <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ background: '#f4f4f4' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nama</th>
            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Waktu</th>
            {isAdmin && <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {daftarAbsenTerfilter.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 3 : 2} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Data tidak ditemukan.
              </td>
            </tr>
          ) : (
            daftarAbsenTerfilter.map((absen) => (
              <tr key={absen.id}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{absen.nama_pegawai}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(absen.waktu_masuk).toLocaleString('id-ID')}</td>
                {isAdmin && (
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(absen.id, absen.nama_pegawai)} 
                        style={{ padding: '0.4rem 0.8rem', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleHapus(absen.id, absen.nama_pegawai)} 
                        style={{ padding: '0.4rem 0.8rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

