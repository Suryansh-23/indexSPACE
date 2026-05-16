'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme, type Theme } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/wagmi'
import { ThemeProvider } from '@/components/theme-provider'

const queryClient = new QueryClient()

function buildTheme(): Theme {
  const base = darkTheme()
  return {
    ...base,
    blurs: { modalOverlay: 'none' },
    colors: {
      ...base.colors,
      accentColor:                    '#0071BB',
      accentColorForeground:          '#F4F1E8',
      actionButtonBorder:             '#2A2823',
      actionButtonBorderMobile:       '#2A2823',
      actionButtonSecondaryBackground:'#16150F',
      closeButton:                    '#8E8A80',
      closeButtonBackground:          '#16150F',
      connectButtonBackground:        '#0071BB',
      connectButtonBackgroundError:   '#D62D20',
      connectButtonInnerBackground:   '#11100E',
      connectButtonText:              '#F4F1E8',
      connectButtonTextError:         '#F4F1E8',
      connectionIndicator:            '#1E9E5A',
      downloadBottomCardBackground:   '#11100E',
      downloadTopCardBackground:      '#16150F',
      error:                          '#D62D20',
      generalBorder:                  '#2A2823',
      generalBorderDim:               '#1E1D1A',
      menuItemBackground:             '#16150F',
      modalBackdrop:                  'rgba(5, 5, 5, 0.88)',
      modalBackground:                '#11100E',
      modalBorder:                    '#2A2823',
      modalText:                      '#F4F1E8',
      modalTextDim:                   '#4E4A42',
      modalTextSecondary:             '#8E8A80',
      profileAction:                  '#16150F',
      profileActionHover:             '#1E1D1A',
      profileForeground:              '#11100E',
      selectedOptionBorder:           '#0071BB',
      standby:                        '#FFC700',
    },
    fonts: {
      body: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    },
    radii: {
      actionButton:  '0px',
      connectButton: '0px',
      menuButton:    '0px',
      modal:         '0px',
      modalMobile:   '0px',
    },
    shadows: {
      connectButton:        'none',
      dialog:               '0 0 0 1px #2A2823, 0 8px 32px rgba(0,0,0,0.6)',
      profileDetailsAction: 'none',
      selectedOption:       '0 0 0 1px #0071BB',
      selectedWallet:       '0 0 0 1px #0071BB',
      walletLogo:           'none',
    },
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={buildTheme()}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
