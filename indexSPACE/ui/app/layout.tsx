import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/providers'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'IndexSpace',
  description: 'Async forecast index vaults powered by FunctionSpace prediction markets.',
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} bg-ix-shell`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-ix-shell text-ix-text" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
