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
      <body>{children}</body>
    </html>
  )
}
