// app/layout.tsx
import './globals.css'; // Mengimpor CSS Global

export const metadata = {
  title: 'Absensi Setum Polri',
  description: 'Aplikasi Absensi Pegawai',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        {/* Bungkus seluruh halaman dengan class main-container */}
        <div className="main-container">
          {children}
        </div>
      </body>
    </html>
  )
}
