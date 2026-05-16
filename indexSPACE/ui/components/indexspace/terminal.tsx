'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { TopBar } from './top-bar'
import { VaultRail } from './vault-rail'
import { VaultDetail } from './vault-detail'
import { IndexChart } from './index-chart'
import { TradeDrawer } from './trade-drawer'
import { ActivityStrip } from './activity-strip'
import { PortfolioDrawer } from './portfolio-drawer'
import { VAULTS, ACTIVITY } from '@/lib/mock-data'

interface TerminalProps {
  initialVaultId?: string
}

export function Terminal({ initialVaultId }: TerminalProps) {
  const [selectedId, setSelectedId] = useState(initialVaultId ?? VAULTS[0]!.id)
  const [portfolioOpen, setPortfolio] = useState(false)

  const { isConnected } = useAccount()
  const vault = VAULTS.find((v) => v.id === selectedId) ?? VAULTS[0]!

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ix-shell">

      {/* Top system bar */}
      <TopBar
        networkOk
        onOpenPortfolio={() => setPortfolio(true)}
      />

      {/* Main body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left vault rail */}
        <VaultRail
          vaults={VAULTS}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Center: vault detail surface */}
        <main className="flex-1 min-w-0 bg-ix-panel overflow-hidden flex flex-col">
          <VaultDetail
            vault={vault}
            chartSlot={<IndexChart vault={vault} />}
          />
        </main>

        {/* Right: trade drawer */}
        <TradeDrawer
          vault={vault}
          walletConnected={isConnected}
        />
      </div>

      {/* Bottom activity strip */}
      <ActivityStrip entries={ACTIVITY} />

      {/* Portfolio drawer overlay */}
      <PortfolioDrawer
        open={portfolioOpen}
        onClose={() => setPortfolio(false)}
        walletConnected={isConnected}
      />
    </div>
  )
}
