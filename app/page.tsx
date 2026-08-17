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

  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarAbsen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeData();
  }, [isCheckingAuth]);

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
    // Validasi Jam Absen (Contoh: Buka 04:00 - 08:00)
    const jamSekarang = new Date().getHours();
    if (jamSekarang < 4 || jamSekarang >= 8) {
      toast.error('Absen hanya dibuka pukul 06:00 - 08:00');
      return;
    }

    if (!nama) { toast.error('Mohon masukkan nama!'); return; }
    const sudahAbsen = daftarAbsen.some((a) => a.nama_pegawai.toLowerCase() === nama.toLowerCase() && a.waktu_masuk.split('T')[0] === new Date().toISOString().split('T')[0]);
    if (sudahAbsen) { toast.error('Sudah absen hari ini!'); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'absensi_harian'), { nama_pegawai: nama, waktu_masuk: new Date().toISOString() });
      toast.success('Absen berhasil!'); setNama('');
    } catch { toast.error('Gagal.'); } finally { setLoading(false); }
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
    const ws = XLSX.utils.json_to_sheet(daftarAbsenTerfilter.map(a => ({"Nama": a.nama_pegawai, "Waktu": new Date(a.waktu_masuk).toLocaleString('id-ID')})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, "Laporan.xlsx");
  };

  const unduhPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, { head: [['Nama', 'Waktu']], body: daftarAbsenTerfilter.map(a => [a.nama_pegawai, new Date(a.waktu_masuk).toLocaleString('id-ID')]) });
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Masukkan Nama atau NRP" style={{ padding: '0.8rem', flex: 1, maxWidth: '350px', borderRadius: '5px', border: '1px solid #ccc' }} />
        <button onClick={handleAbsen} disabled={loading} style={{ padding: '0.8rem 1.5rem', background: '#001f3f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '...' : 'Absen'}</button>
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
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead><tr style={{ background: '#f4f4f4' }}><th style={{ padding: '12px', border: '1px solid #ddd' }}>Nama</th><th style={{ padding: '12px', border: '1px solid #ddd' }}>Waktu</th>{isAdmin && <th style={{ padding: '12px', border: '1px solid #ddd' }}>Aksi</th>}</tr></thead>
          <tbody>
            {dataTampil.map((a) => (
              <tr key={a.id}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{a.nama_pegawai}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(a.waktu_masuk).toLocaleString('id-ID')}</td>
                {isAdmin && <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <button onClick={() => handleEdit(a.id, a.nama_pegawai)} style={{ background: '#ffc107', border: 'none', marginRight: '5px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleHapus(a.id)} style={{ background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>Hapus</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button disabled={halamanSaatIni === 1} onClick={() => setHalamanSaatIni(halamanSaatIni - 1)}>Sebelumnya</button>
        <span>Halaman {halamanSaatIni} dari {totalHalaman || 1}</span>
        <button disabled={halamanSaatIni >= totalHalaman} onClick={() => setHalamanSaatIni(halamanSaatIni + 1)}>Selanjutnya</button>
      </div>
    </main>
  );
}

