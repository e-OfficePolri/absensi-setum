// app/components/FormAbsensi.tsx
import React from 'react';
import Webcam from 'react-webcam';

// Ini adalah "Props", daftar data yang dibutuhkan form ini dari luar
interface FormAbsensiProps {
  butuhKamera: boolean | undefined;
  kameraTerbuka: boolean;
  setKameraTerbuka: (b: boolean) => void;
  webcamRef: React.RefObject<Webcam>;
  nama: string;
  setNama: (nama: string) => void;
  daftarPegawai: any[];
  absenPegawaiHariIni: any;
  statusKehadiran: string;
  setStatusKehadiran: (status: string) => void;
  handleAbsen: () => void;
  tombolDisable: boolean;
  loading: boolean;
  teksTombol: string;
  warnaTombol: string;
}

export default function FormAbsensi({
  butuhKamera,
  kameraTerbuka,
  setKameraTerbuka,
  webcamRef,
  nama,
  setNama,
  daftarPegawai,
  absenPegawaiHariIni,
  statusKehadiran,
  setStatusKehadiran,
  handleAbsen,
  tombolDisable,
  loading,
  teksTombol,
  warnaTombol
}: FormAbsensiProps) {
  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', marginBottom: '2.5rem' }}>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#001f3f', fontSize: '1.3rem', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>Form Absensi</h2>
      
      {/* Area Kamera */}
      {butuhKamera && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #ccc' }}>
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

      {/* Area Input (Nama, Status, Tombol Absen) */}
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
  );
}
