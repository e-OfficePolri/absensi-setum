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
  
  // --- STATE PAGINATION ---
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

  // Logika Filter & Pencarian
  const daftarAbsenTerfilter = daftarAbsen.filter((absen) => {
    const cocokTanggal = !filterTanggal || (absen.waktu_masuk?.split('T')[0] === filterTanggal);
    const cocokNama = !kataKunci || absen.nama_pegawai.toLowerCase().includes(kataKunci.toLowerCase());
    return cocokTanggal && cocokNama;
  });

  // --- LOGIKA PAGINATION ---
  const indexTerakhir = halamanSaatIni * barisPerHalaman;
  const indexPertama = indexTerakhir - barisPerHalaman;
  const dataTampil = daftarAbsenTerfilter.slice(indexPertama, indexTerakhir);
  const totalHalaman = Math.ceil(daftarAbsenTerfilter.length / barisPerHalaman);

  useEffect(() => { setHalamanSaatIni(1); }, [filterTanggal, kataKunci]);

  // --- FUNGSI-FUNGSI UTAMA ---
  const handleLogout = async () => { await signOut(auth); router.push('/login'); };

  const handleAbsen = async () => {
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
    const ws = XLSX.utils.json_to_sheet(daftarAbsenTerfilter.map(a => ({"Nama": a.nama_pegawai, "Waktu": new Date(a.waktu_masuk).toLocaleString()})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, "Laporan.xlsx");
  };

  const unduhPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, { head: [['Nama', 'Waktu']], body: daftarAbsenTerfilter.map(a => [a.nama_pegawai, new Date(a.waktu_masuk).toLocaleString()]) });
    doc.save("Laporan.pdf");
  };

  if (isCheckingAuth) return <div>Memeriksa keamanan...</div>;

  return (
    <main style={{ padding: '2rem' }}>
      <Toaster />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Absensi Setum Polri</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Masukkan Nama" />
      <button onClick={handleAbsen} disabled={loading}>Absen</button>

      <div style={{ marginTop: '1rem' }}>
        <input type="date" onChange={(e) => setFilterTanggal(e.target.value)} />
        <input placeholder="Cari nama..." onChange={(e) => setKataKunci(e.target.value)} />
      </div>

      {isAdmin && (
        <div>
          <button onClick={unduhExcel}>Excel</button>
          <button onClick={unduhPDF}>PDF</button>
        </div>
      )}

      <table>
        <thead><tr><th>Nama</th><th>Waktu</th>{isAdmin && <th>Aksi</th>}</tr></thead>
        <tbody>
          {dataTampil.map((absen) => (
            <tr key={absen.id}>
              <td>{absen.nama_pegawai}</td>
              <td>{new Date(absen.waktu_masuk).toLocaleString()}</td>
              {isAdmin && (
                <td>
                  <button onClick={() => handleEdit(absen.id, absen.nama_pegawai)}>Edit</button>
                  <button onClick={() => handleHapus(absen.id)}>Hapus</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Navigasi Pagination */}
      <div style={{ marginTop: '1rem' }}>
        <button disabled={halamanSaatIni === 1} onClick={() => setHalamanSaatIni(halamanSaatIni - 1)}>Sebelumnya</button>
        <span> Halaman {halamanSaatIni} dari {totalHalaman || 1} </span>
        <button disabled={halamanSaatIni >= totalHalaman} onClick={() => setHalamanSaatIni(halamanSaatIni + 1)}>Selanjutnya</button>
      </div>
    </main>
  );
}

