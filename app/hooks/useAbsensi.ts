// app/hooks/useAbsensi.ts
import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { hitungJarakMeter } from '../utils/helper';

export const useAbsensi = (isCheckingAuth: boolean) => {
  // 1. Inisialisasi State
  const [nama, setNama] = useState('');
  const [statusKehadiran, setStatusKehadiran] = useState('Hadir');
  const [loading, setLoading] = useState(false);
  const [daftarAbsen, setDaftarAbsen] = useState<any[]>([]);
  const [daftarPegawai, setDaftarPegawai] = useState<any[]>([]);
  const [kameraTerbuka, setKameraTerbuka] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  // 2. Mengambil Data Absensi Harian dari Firebase
  useEffect(() => {
    if (isCheckingAuth) return; 
    const q = query(collection(db, 'absensi_harian'), orderBy('waktu_masuk', 'desc'));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setDaftarAbsen(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, () => console.log("Info: Sesi berakhir."));
    return () => unsubscribeData();
  }, [isCheckingAuth]);

  // 3. Mengambil Data Pegawai dari Firebase
  useEffect(() => {
    if (isCheckingAuth) return;
    const q = query(collection(db, 'pegawai'), orderBy('nama', 'asc'));
    const unsubscribePegawai = onSnapshot(q, (snapshot) => {
      setDaftarPegawai(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, () => console.log("Info: Sesi berakhir."));
    return () => unsubscribePegawai();
  }, [isCheckingAuth]);

  // 4. Logika Absen (Masuk dan Pulang)
  const handleAbsen = async (absenPegawaiHariIni: any, tanggalHariIni: string) => {
    if (!nama) { toast.error('Mohon pilih nama Anda!'); return; }
    const jamSekarang = new Date().getHours();
    setLoading(true);
    let loadingToast;

    try {
      if (absenPegawaiHariIni && !absenPegawaiHariIni.waktu_pulang) {
        // Logika Absen Pulang
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
        // Logika Absen Masuk
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

  // 5. Logika Edit & Hapus
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

  return {
    nama, setNama,
    statusKehadiran, setStatusKehadiran,
    loading, setLoading,
    daftarAbsen,
    daftarPegawai,
    kameraTerbuka, setKameraTerbuka,
    webcamRef,
    handleAbsen, handleEdit, handleHapus
  };
};
