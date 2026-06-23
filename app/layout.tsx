import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from './providers'

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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#1A0A06] overflow-hidden" style={{ height: '100dvh' }}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
