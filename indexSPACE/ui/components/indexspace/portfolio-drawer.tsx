'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ActivityEntry } from '@/lib/types'
import { ACTIVITY } from '@/lib/mock-data'

type Tab = 'portfolio' | 'requests' | 'activity'

interface PortfolioDrawerProps {
  open: boolean
  onClose: () => void
  walletConnected: boolean
}

export function PortfolioDrawer({ open, onClose, walletConnected }: PortfolioDrawerProps) {
  const [tab, setTab] = useState<Tab>('portfolio')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/70" onClick={onClose} />
      <aside className="w-[360px] max-md:w-[300px] bg-ix-shell border-l border-ix-border flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ix-border">
          <div>
            <div className="text-[11px] font-mono font-medium text-ix-text tracking-wider uppercase">ACCOUNT CONSOLE</div>
            <div className="text-[8px] font-mono text-ix-text-faint tracking-[0.2em] mt-[3px]">{walletConnected ? '0x4f2a...8c1d  /  BASE SEPOLIA' : 'NO WALLET CONNECTED'}</div>
          </div>
          <button onClick={onClose} aria-label="close portfolio" className="text-ix-text-faint hover:text-ix-text transition-colors"><X size={14} /></button>
        </div>

        <div className="flex border-b border-ix-border">
          {(['portfolio', 'requests', 'activity'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.18em] border-r last:border-r-0 border-ix-border transition-colors', tab === t ? 'bg-ix-panel text-ix-text border-b-2 border-b-ix-blue' : 'text-ix-text-faint hover:text-ix-text-muted hover:bg-ix-panel-warm')}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!walletConnected ? <Disconnected /> : (
            <>
              {tab === 'portfolio' && <PortfolioContent />}
              {tab === 'requests' && <RequestsContent />}
              {tab === 'activity' && <ActivityContent entries={ACTIVITY} />}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function Disconnected() {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-px mb-8 mt-4">
        {[3, 5, 4, 3, 5, 2].map((w, i) => (
          <div key={i} className="flex gap-px">
            {Array.from({ length: 6 }, (_, j) => <div key={j} className={cn('h-[3px] w-[10px]', j < w ? 'bg-ix-border-bright' : 'bg-transparent')} />)}
          </div>
        ))}
      </div>
      <div className="text-[11px] font-mono text-ix-text font-medium mb-1 tracking-wider">ACCOUNT CONSOLE</div>
      <div className="text-[10px] font-mono text-ix-text-muted mb-4 leading-relaxed">Connect wallet to inspect shares, requests, and claimable assets.</div>
      <div className="border border-ix-border px-3 py-2.5 mb-6">
        <div className="text-[8px] font-mono text-ix-text-faint tracking-[0.2em] uppercase mb-2">VAULT SHARES</div>
        {['VAULT 01 / AI ACCELERATION', 'VAULT 02 / CRYPTO REFLEXIVITY'].map((v) => (
          <div key={v} className="flex items-center justify-between py-1.5 border-b border-ix-border-dim last:border-b-0">
            <span className="text-[9px] font-mono text-ix-text-muted">{v}</span>
            <span className="text-[9px] font-mono text-ix-text-faint">- shares</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PortfolioContent() {
  const holdings = [
    { label: 'VAULT 01', name: 'AI ACCELERATION', shares: 482, nav: 1.0847, value: 522.74, color: '#0071BB' },
    { label: 'VAULT 02', name: 'CRYPTO REFLEXIVITY', shares: 250, nav: 0.9312, value: 232.80, color: '#F05A24' },
  ]
  const total = holdings.reduce((s, h) => s + h.value, 0)

  return (
    <div>
      <div className="px-5 py-4 border-b border-ix-border">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-1.5">TOTAL VAULT VALUE</div>
        <div className="text-[28px] font-mono tabular text-ix-text font-medium leading-none">${total.toFixed(2)}</div>
        <div className="text-[9px] font-mono text-ix-text-muted mt-1 tracking-wider">{'\u2248'} USDC / BASE SEPOLIA</div>
      </div>

      <div className="px-5 pt-4">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">VAULT SHARES</div>
        {holdings.map((h) => (
          <div key={h.label} className="py-3.5 border-b border-ix-border-dim">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 shrink-0" style={{ backgroundColor: h.color }} />
                <span className="text-[12px] font-mono text-ix-text font-medium">{h.label}</span>
              </div>
              <span className="text-[13px] font-mono tabular text-ix-text">${h.value.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-[11px]">
              <span className="text-[10px] font-mono text-ix-text-muted">{h.name}</span>
              <span className="text-[9px] font-mono tabular text-ix-text-faint">{h.shares} shrs @ {h.nav.toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-ix-border">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">WALLET</div>
        <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-mono text-ix-text-muted">USDC balance</span><span className="text-[13px] font-mono tabular text-ix-text">4,267.33</span></div>
        <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-mono text-ix-text-muted">claimable requests</span><span className="text-[13px] font-mono tabular text-ix-orange">1</span></div>
        <div className="flex items-center justify-between"><span className="text-[10px] font-mono text-ix-text-muted">address</span><span className="text-[9px] font-mono text-ix-text-faint">0x4f2a...8c1d</span></div>
      </div>
    </div>
  )
}

function RequestsContent() {
  const requests = [
    { id: 'REQ-0041', vault: 'VAULT 01', type: 'SUB', amount: '1,000 USDC', state: 'claim_ready', ts: '2m ago' },
    { id: 'REQ-0040', vault: 'VAULT 02', type: 'RDM', amount: '250 shares', state: 'pending', ts: '15m ago' },
    { id: 'REQ-0038', vault: 'VAULT 01', type: 'SUB', amount: '500 USDC', state: 'claimed', ts: '2h ago' },
  ]

  const sc: Record<string, { color: string; label: string }> = {
    claim_ready: { color: 'text-ix-orange', label: 'CLAIMABLE' },
    pending: { color: 'text-ix-blue', label: 'PENDING' },
    claimed: { color: 'text-ix-green', label: 'CLAIMED' },
    failed: { color: 'text-ix-red', label: 'FAILED' },
  }

  return (
    <div className="px-5 pt-4">
      <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">ASYNC REQUESTS</div>
      {requests.map((r) => {
        const s = sc[r.state]
        return (
          <div key={r.id} className="py-3.5 border-b border-ix-border-dim">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('text-[8px] font-mono px-1.5 py-0.5 leading-none', r.type === 'SUB' ? 'bg-ix-blue text-ix-shell' : r.type === 'RDM' ? 'bg-ix-orange text-ix-shell' : 'bg-ix-text-faint text-ix-shell')}>{r.type}</span>
                <span className="text-[10px] font-mono text-ix-text-faint tabular">{r.id}</span>
              </div>
              <span className={cn('text-[9px] font-mono uppercase tracking-wider', s?.color)}>{s?.label ?? r.state}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-[11px] font-mono text-ix-text">{r.vault}</span><span className="text-[10px] font-mono tabular text-ix-text-muted">{r.amount}</span></div>
              <span className="text-[8px] font-mono text-ix-text-faint">{r.ts}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivityContent({ entries }: { entries: ActivityEntry[] }) {
  const stateColor: Record<string, string> = { executing: 'text-ix-yellow', pending: 'text-ix-blue', claim_ready: 'text-ix-orange', claimed: 'text-ix-green', complete: 'text-ix-green', failed: 'text-ix-red', info: 'text-ix-text-faint' }
  const typeTags: Record<string, { tag: string; bg: string }> = { subscribe: { tag: 'SUB', bg: 'bg-ix-blue' }, redeem: { tag: 'RDM', bg: 'bg-ix-orange' }, claim: { tag: 'CLM', bg: 'bg-ix-green' }, curator: { tag: 'CUR', bg: 'bg-ix-yellow' }, system: { tag: 'SIM', bg: 'bg-ix-text-faint' } }

  return (
    <div className="px-5 pt-4">
      <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">EXECUTION LOG</div>
      {entries.map((e) => {
        const tt = typeTags[e.type] ?? typeTags.system
        return (
          <div key={e.id} className="py-2.5 border-b border-ix-border-dim flex items-start gap-3">
            <span className="text-[8px] font-mono text-ix-text-faint mt-0.5 w-8 tabular shrink-0">{getRelTime(e.ts)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={cn('text-[8px] font-mono text-ix-shell px-1.5 py-[2px] leading-none', tt.bg)}>{tt.tag}</span>
                <span className="text-[10px] font-mono text-ix-text">{e.vault}</span>
                {e.amount && <span className="text-[9px] font-mono tabular text-ix-text-muted">{e.amount}</span>}
                {e.user && <span className="text-[8px] font-mono text-ix-text-faint">{e.user}</span>}
              </div>
              <span className={cn('text-[8px] font-mono uppercase tracking-wider', stateColor[e.state] ?? 'text-ix-text-faint')}>{e.state.replace('_', ' ')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getRelTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}
