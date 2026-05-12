'use client'

import { useState } from 'react'
import { TopBar } from './top-bar'
import { VaultRail } from './vault-rail'
import { VaultDetail } from './vault-detail'
import { IndexChart } from './index-chart'
import { TradeDrawer } from './trade-drawer'
import { ActivityStrip } from './activity-strip'
import { PortfolioDrawer } from './portfolio-drawer'
import { VAULTS, ACTIVITY } from '@/lib/mock-data'

export function Terminal({ initialVaultId }: { initialVaultId?: string }) {
  const [selectedId, setSelectedId] = useState(initialVaultId ?? VAULTS[0]!.id)
  const [walletConnected, setWallet] = useState(false)
  const [portfolioOpen, setPortfolio] = useState(false)

  const vault = VAULTS.find((v) => v.id === selectedId) ?? VAULTS[0]!

  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-ix-shell">
      <TopBar
        networkOk
        walletConnected={walletConnected}
        onConnectWallet={() => setWallet((p) => !p)}
        onOpenPortfolio={() => setPortfolio(true)}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <VaultRail vaults={VAULTS} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="flex-1 min-w-0 bg-ix-panel overflow-hidden flex flex-col">
          <VaultDetail vault={vault} chartSlot={<IndexChart vault={vault} />} />
        </main>

        <TradeDrawer vault={vault} walletConnected={walletConnected} onConnectWallet={() => setWallet(true)} />
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
