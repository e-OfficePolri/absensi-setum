// app/components/DashboardAdmin.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
// Memindahkan impor grafik ke sini
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Mendaftarkan elemen grafik
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

// Props: Data yang dibutuhkan oleh komponen ini dari page.tsx
interface DashboardAdminProps {
  isAdmin: boolean;
  kehadiranHariIni: number;
  totalDataAbsen: number;
  dataChart: any;
  opsiChart: any;
}

export default function DashboardAdmin({
  isAdmin,
  kehadiranHariIni,
  totalDataAbsen,
  dataChart,
  opsiChart
}: DashboardAdminProps) {
  const router = useRouter();

  // Jika user bukan admin, sembunyikan dashboard ini
  if (!isAdmin) return null;

  return (
    <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#001f3f', fontSize: '1.3rem', fontWeight: '700' }}>Dashboard Statistik</h2>
        <button 
          onClick={() => router.push('/pegawai')} 
          style={{ padding: '0.6rem 1.2rem', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(23, 162, 184, 0.3)' }}
        >
          ⚙️ Kelola Pegawai
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '150px', background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,31,63,0.2)' }}>
          <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '5px' }}>Hadir Hari Ini</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>{kehadiranHariIni}</div>
        </div>
        <div style={{ flex: 1, minWidth: '150px', background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)', color: '#001f3f', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(241,196,15,0.2)' }}>
          <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '5px' }}>Total Data Absen</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>{totalDataAbsen}</div>
        </div>
      </div>

      <div style={{ width: '100%', height: '250px' }}>
        <Bar data={dataChart} options={opsiChart} />
      </div>
    </div>
  );
}
