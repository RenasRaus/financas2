import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Finanças Raupps',
  description: 'Gerencie suas finanças pessoais com facilidade',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="h-full bg-background font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
