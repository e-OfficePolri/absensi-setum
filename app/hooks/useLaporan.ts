// app/hooks/useLaporan.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const useLaporan = (daftarAbsenTerfilter: any[]) => {
  
  const unduhExcel = () => {
    const ws = XLSX.utils.json_to_sheet(daftarAbsenTerfilter.map(a => ({
      "Nama Pegawai": a.nama_pegawai, 
      "Status": a.status_kehadiran || 'Hadir', 
      "Waktu Masuk": new Date(a.waktu_masuk).toLocaleString('id-ID'),
      "Waktu Pulang": a.waktu_pulang ? new Date(a.waktu_pulang).toLocaleString('id-ID') : 'Belum Pulang'
    })));
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Laporan"); 
    XLSX.writeFile(wb, "Laporan.xlsx");
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

  return { unduhExcel, unduhPDF };
};
