// app/utils/helper.ts

/**
 * Fungsi untuk menghitung jarak antara dua titik koordinat GPS dalam satuan meter.
 * Menggunakan formula Haversine.
 */
export const hitungJarakMeter = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Radius bumi dalam meter
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + 
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Hasil dalam meter
};
