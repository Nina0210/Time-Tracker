import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Time Tracker',
  description: 'Track your working hours',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-gray-800 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
