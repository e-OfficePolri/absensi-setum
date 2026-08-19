// components/FilterAbsensi.tsx
import React from 'react';

// Di sini kita mendefinisikan "jembatan" atau Props.
// Ini memberi tahu komponen tipe data apa saja yang akan ia terima.
interface PropsFilter {
  filterBulan: string;
  setFilterBulan: (nilai: string) => void;
  filterTanggal: string;
  setFilterTanggal: (nilai: string) => void;
  kataKunci: string;
  setKataKunci: (nilai: string) => void;
}

export default function FilterAbsensi({
  filterBulan,
  setFilterBulan,
  filterTanggal,
  setFilterTanggal,
  kataKunci,
  setKataKunci
}: PropsFilter) {

  // Fungsi untuk membersihkan semua filter kembali kosong
  const resetFilter = () => {
    setFilterBulan('');
    setFilterTanggal('');
    setKataKunci('');
  };

  return (
    <div className="filter-container">
      {/* Input Filter Bulan */}
      <div>
        <label className="filter-label">Filter Bulan</label>
        <input 
          type="month" 
          className="modern-input" 
          value={filterBulan} 
          onChange={(e) => { 
            setFilterBulan(e.target.value); 
            setFilterTanggal(''); // Kosongkan tanggal jika bulan dipilih
          }} 
          style={{ width: '150px' }} 
        />
      </div>

      {/* Input Filter Tanggal */}
      <div>
        <label className="filter-label">Filter Tanggal</label>
        <input 
          type="date" 
          className="modern-input" 
          value={filterTanggal} 
          onChange={(e) => { 
            setFilterTanggal(e.target.value); 
            setFilterBulan(''); // Kosongkan bulan jika tanggal dipilih
          }} 
          style={{ width: '140px' }} 
        />
      </div>

      {/* Input Cari Nama */}
      <div style={{ flex: 1, minWidth: '150px' }}>
        <label className="filter-label">Cari Nama Personel</label>
        <input 
          placeholder="Ketik nama di sini..." 
          className="modern-input" 
          value={kataKunci} 
          onChange={(e) => setKataKunci(e.target.value)} 
          style={{ width: '100%', boxSizing: 'border-box' }} 
        />
      </div>

      {/* Tombol Reset */}
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button onClick={resetFilter} className="btn-secondary">
          Reset Filter
        </button>
      </div>
    </div>
  );
}
