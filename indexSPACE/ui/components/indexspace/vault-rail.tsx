'use client'

import { cn } from '@/lib/utils'
import type { Vault } from '@/lib/types'

interface VaultRailProps {
  vaults: Vault[]
  selectedId: string
  onSelect: (id: string) => void
}

const VAULT_ACCENT = ['#0071BB', '#F05A24', '#8E8A80', '#FFC700']

export function VaultRail({ vaults, selectedId, onSelect }: VaultRailProps) {
  return (
    <aside className="w-[180px] bg-ix-shell border-r border-ix-border flex flex-col shrink-0 overflow-y-auto max-md:hidden">
      <div className="px-3 py-2.5 border-b border-ix-border">
        <span className="text-[8px] font-mono tracking-[0.25em] text-ix-text-faint uppercase">INDICES</span>
      </div>

      {vaults.map((vault, idx) => {
        const sel = vault.id === selectedId
        const isLive = vault.status === 'live'
        const up = vault.navChange >= 0
        const accent = VAULT_ACCENT[idx % VAULT_ACCENT.length]!

        return (
          <button
            key={vault.id}
            onClick={() => onSelect(vault.id)}
            className={cn(
              'w-full text-left border-b border-ix-border transition-colors group relative',
              sel ? 'bg-ix-panel' : 'hover:bg-ix-panel-warm'
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: sel ? accent : 'transparent' }} />

            <div className="pl-4 pr-3 pt-3 pb-3">
              <div className="flex items-center justify-between mb-[6px]">
                <span
                  className="text-[9px] font-mono font-medium tracking-[0.15em] leading-none"
                  style={{ color: sel ? accent : '#4E4A42' }}
                >
                  {vault.label}
                </span>
                <VaultLED vault={vault} />
              </div>

              <div className={cn(
                'text-[11px] font-mono font-medium leading-tight mb-2.5',
                sel ? 'text-ix-text' : 'text-ix-text-muted group-hover:text-ix-text-dim'
              )}>
                {vault.name}
              </div>

              <div className="flex items-baseline justify-between">
                <span className={cn('text-[14px] font-mono tabular font-medium leading-none', sel ? 'text-ix-text' : 'text-ix-text-dim')}>
                  {vault.nav.toFixed(4)}
                </span>
                <span className={cn('text-[10px] font-mono tabular leading-none', vault.navChange === 0 ? 'text-ix-text-faint' : up ? 'text-ix-green' : 'text-ix-red')}>
                  {vault.navChange === 0 ? '—' : `${up ? '+' : ''}${vault.navChange.toFixed(2)}%`}
                </span>
              </div>

              {isLive && (
                <div className="mt-2.5">
                  <div className="h-[2px] bg-ix-border-dim w-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 h-full transition-all" style={{ width: `${(vault.shares / vault.totalSupply) * 100}%`, backgroundColor: accent, opacity: sel ? 1 : 0.5 }} />
                  </div>
                  <div className="flex justify-between mt-[4px]">
                    <span className="text-[8px] font-mono text-ix-text-faint tabular">{(vault.shares / 1000).toFixed(1)}K shrs</span>
                    <span className="text-[8px] font-mono tabular" style={{ color: accent, opacity: 0.8 }}>{((vault.shares / vault.totalSupply) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}

              {!isLive && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="size-[5px] bg-ix-yellow opacity-60" />
                  <span className="text-[8px] font-mono tracking-[0.15em] text-ix-yellow opacity-70 uppercase">SIM ONLY</span>
                </div>
              )}
            </div>
          </button>
        )
      })}

      <div className="flex-1" />
      <div className="px-3 py-2.5 border-t border-ix-border">
        <span className="text-[8px] font-mono text-ix-text-faint tracking-wider">FunctionSpace protocol</span>
      </div>
    </aside>
  )
}

function VaultLED({ vault }: { vault: Vault }) {
  if (vault.status === 'preview') {
    return (
      <div className="flex items-center gap-1">
        <span className="size-[5px] bg-ix-yellow opacity-50 led-pulse" />
        <span className="text-[8px] font-mono text-ix-text-faint uppercase tracking-widest">SIM</span>
      </div>
    )
  }

  const dotColor = vault.curatorState === 'armed' ? 'bg-ix-green' : vault.curatorState === 'executing' ? 'bg-ix-yellow led-pulse' : 'bg-ix-text-faint'
  const label = vault.curatorState === 'armed' ? 'ARMED' : vault.curatorState === 'executing' ? 'EXEC' : 'IDLE'

  return (
    <div className="flex items-center gap-1">
      <span className={cn('size-[5px]', dotColor)} />
      <span className="text-[8px] font-mono text-ix-text-faint uppercase tracking-widest">{label}</span>
    </div>
  )
}
