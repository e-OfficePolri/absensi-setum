// app/components/TabelAbsensi.tsx
import React from 'react';

// Ini adalah "Props" (jembatan data). 
// Kita memberi tahu React data apa saja yang dibutuhkan oleh tabel ini dari luar.
interface TabelAbsensiProps {
  dataTampil: any[];
  isAdmin: boolean;
  handleEdit: (id: string, namaLama: string) => void;
  handleHapus: (id: string) => void;
  halamanSaatIni: number;
  totalHalaman: number;
  setHalamanSaatIni: (halaman: number) => void;
}

export default function TabelAbsensi({
  dataTampil,
  isAdmin,
  handleEdit,
  handleHapus,
  halamanSaatIni,
  totalHalaman,
  setHalamanSaatIni
}: TabelAbsensiProps) {
  return (
    <>
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

      {/* Navigasi Halaman */}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        <button disabled={halamanSaatIni === 1} onClick={() => setHalamanSaatIni(halamanSaatIni - 1)} style={{ padding: '0.6rem 1.2rem', background: halamanSaatIni === 1 ? '#f3f4f6' : '#001f3f', color: halamanSaatIni === 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: halamanSaatIni === 1 ? 'not-allowed' : 'pointer' }}>&larr; Sebelumnya</button>
        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#4b5563' }}>Halaman {halamanSaatIni} dari {totalHalaman || 1}</span>
        <button disabled={halamanSaatIni >= totalHalaman} onClick={() => setHalamanSaatIni(halamanSaatIni + 1)} style={{ padding: '0.6rem 1.2rem', background: halamanSaatIni >= totalHalaman ? '#f3f4f6' : '#001f3f', color: halamanSaatIni >= totalHalaman ? '#9ca3af' : 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: halamanSaatIni >= totalHalaman ? 'not-allowed' : 'pointer' }}>Selanjutnya &rarr;</button>
      </div>
    </>
  );
}
