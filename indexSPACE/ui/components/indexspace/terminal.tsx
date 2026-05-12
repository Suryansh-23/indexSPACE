'use client'

import { useState, useEffect } from 'react'
import { TopBar } from './top-bar'
import { VaultRail } from './vault-rail'
import { VaultDetail } from './vault-detail'
import { IndexChart } from './index-chart'
import { TradeDrawer } from './trade-drawer'
import { ActivityStrip } from './activity-strip'
import { PortfolioDrawer } from './portfolio-drawer'
import { VAULTS, ACTIVITY } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

function useMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export function Terminal({ initialVaultId }: { initialVaultId?: string }) {
  const [selectedId, setSelectedId] = useState(initialVaultId ?? VAULTS[0]!.id)
  const [walletConnected, setWallet] = useState(false)
  const [portfolioOpen, setPortfolio] = useState(false)
  const [tradeOpen, setTradeOpen] = useState(false)
  const mobile = useMobile()

  const vault = VAULTS.find((v) => v.id === selectedId) ?? VAULTS[0]!

  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-ix-shell">
      <TopBar
        networkOk
        walletConnected={walletConnected}
        onConnectWallet={() => setWallet((p) => !p)}
        onOpenPortfolio={() => setPortfolio(true)}
      />

      {mobile && (
        <div className="flex shrink-0 border-b border-ix-border bg-ix-shell overflow-x-auto px-2 py-1.5 gap-1">
          {VAULTS.map((v) => {
            const sel = v.id === selectedId
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  'shrink-0 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider border transition-colors',
                  sel ? 'bg-ix-blue text-ix-shell border-ix-blue' : 'text-ix-text-muted border-ix-border hover:text-ix-text-dim',
                )}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <VaultRail vaults={VAULTS} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="flex-1 min-w-0 bg-ix-panel overflow-hidden flex flex-col relative">
          <VaultDetail vault={vault} chartSlot={<IndexChart vault={vault} />} />

          {mobile && (
            <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
              {vault.status === 'live' && (
                <button
                  onClick={() => setTradeOpen(true)}
                  className="bg-ix-blue text-ix-shell px-5 py-3 text-[11px] font-mono uppercase tracking-widest shadow-lg"
                >
                  TRADE
                </button>
              )}
            </div>
          )}
        </main>

        {mobile ? (
          tradeOpen && (
            <div className="fixed inset-0 z-50 flex flex-col bg-ix-shell">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-ix-border">
                <span className="text-[8px] font-mono tracking-[0.25em] text-ix-text-faint uppercase">TRADE</span>
                <button onClick={() => setTradeOpen(false)} className="text-ix-text-faint hover:text-ix-text text-[11px] font-mono tracking-wider">CLOSE</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TradeDrawer vault={vault} walletConnected={walletConnected} onConnectWallet={() => setWallet(true)} />
              </div>
            </div>
          )
        ) : (
          <TradeDrawer vault={vault} walletConnected={walletConnected} onConnectWallet={() => setWallet(true)} />
        )}
      </div>

      <ActivityStrip entries={ACTIVITY} />

      <PortfolioDrawer
        open={portfolioOpen}
        onClose={() => setPortfolio(false)}
        walletConnected={walletConnected}
      />
    </div>
  )
}
