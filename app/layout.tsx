import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magic Diary',
  description: 'Twoje czarodziejskie wspomnienia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#1A0A06] min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
