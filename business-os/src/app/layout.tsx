import type { Metadata } from 'next'
import { Rajdhani, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { CommandBar } from '@/components/CommandBar'

const title = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-title' })
const mono = Share_Tech_Mono({ subsets: ['latin'], weight: '400', variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Business OS',
  description: 'AI Business Operating System — memoria, analista, coordinador y copiloto estratégico de tu empresa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${title.variable} ${mono.variable}`}>
      <body>
        <div className="scanlines" />
        <div className="scanbar" />
        <Sidebar />
        <main className="ml-16 min-h-screen px-8 pb-10">
          <div className="mx-auto max-w-5xl">
            <CommandBar />
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
