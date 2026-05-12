'use client'

import { cn } from '@/lib/utils'
import type { ActivityEntry } from '@/lib/types'

interface ActivityStripProps {
  entries: ActivityEntry[]
}

const TYPE_CFG: Record<string, { tag: string; bg: string }> = {
  subscribe: { tag: 'SUB', bg: 'bg-ix-blue' },
  redeem: { tag: 'RDM', bg: 'bg-ix-orange' },
  claim: { tag: 'CLM', bg: 'bg-ix-green' },
  curator: { tag: 'CUR', bg: 'bg-ix-yellow' },
  system: { tag: 'SIM', bg: 'bg-ix-text-faint' },
}

const STATE_COLOR: Record<string, string> = {
  executing: 'text-ix-yellow', pending: 'text-ix-blue', claim_ready: 'text-ix-orange',
  claimed: 'text-ix-green', complete: 'text-ix-green', failed: 'text-ix-red', info: 'text-ix-text-faint',
}

export function ActivityStrip({ entries }: ActivityStripProps) {
  return (
    <footer className="h-8 bg-ix-shell border-t border-ix-border flex items-stretch shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 border-r border-ix-border shrink-0">
        <div className="size-[5px] bg-ix-green led-pulse" />
        <span className="text-[8px] font-mono tracking-[0.25em] text-ix-text-faint uppercase">LIVE TAPE</span>
      </div>

      <div className="flex items-center overflow-x-auto flex-1 gap-0">
        {entries.map((e) => {
          const cfg = TYPE_CFG[e.type] ?? TYPE_CFG.system
          const relTime = getRelTime(e.ts)
          return (
            <div key={e.id} className="flex items-center gap-2 px-3.5 border-r border-ix-border-dim shrink-0 h-full hover:bg-ix-panel-warm transition-colors">
              <span className={cn('text-[8px] font-mono font-medium px-1.5 py-[2px] leading-none tracking-wider', cfg.bg, 'text-ix-shell')}>{cfg.tag}</span>
              <span className="text-[9px] font-mono text-ix-text-muted">{e.vault}</span>
              {e.amount && <span className="text-[9px] font-mono tabular text-ix-text-dim">{e.amount}</span>}
              {e.user && <span className="text-[8px] font-mono text-ix-text-faint">{e.user}</span>}
              <span className={cn('text-[8px] font-mono uppercase tracking-wider', STATE_COLOR[e.state] ?? 'text-ix-text-faint')}>{e.state.replace('_', ' ')}</span>
              <span className="text-[8px] font-mono text-ix-text-faint">{relTime}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 px-4 border-l border-ix-border shrink-0">
        <span className="text-[8px] font-mono text-ix-yellow uppercase tracking-widest">BASE SEPOLIA</span>
      </div>
    </footer>
  )
}

function getRelTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}
