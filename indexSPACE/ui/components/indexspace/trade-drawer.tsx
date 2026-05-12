'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, Loader } from 'lucide-react'
import type { Vault, TradeMode } from '@/lib/types'
import { TRADE_STEPS, type TradeStep } from '@/lib/mock-data'

interface TradeDrawerProps {
  vault: Vault
  walletConnected: boolean
  onConnectWallet: () => void
}

const STEP_COLORS: Record<TradeStep, string> = {
  'connect wallet': '#4E4A42',
  'approve usdc': '#4E4A42',
  request: '#0071BB',
  'curator executing': '#FFC700',
  'claim ready': '#F05A24',
  claimed: '#1E9E5A',
}

const STEP_LABELS: Record<TradeStep, string> = {
  'connect wallet': '01 WALLET',
  'approve usdc': '02 APPROVE',
  request: '03 REQUEST',
  'curator executing': '04 CURATOR',
  'claim ready': '05 CLAIMABLE',
  claimed: '06 CLAIMED',
}

export function TradeDrawer({ vault, walletConnected, onConnectWallet }: TradeDrawerProps) {
  const [mode, setMode] = useState<TradeMode>('subscribe')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<TradeStep>('connect wallet')
  const [loading, setLoading] = useState(false)

  const isLive = vault.status === 'live'
  const num = parseFloat(amount) || 0
  const estShares = num > 0 ? (num / vault.nav).toFixed(2) : '—'
  const estUsdc = num > 0 ? (num * vault.nav).toFixed(2) : '—'
  const currentIdx = TRADE_STEPS.indexOf(step)

  function advance() {
    if (!walletConnected) { onConnectWallet(); setStep('approve usdc'); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const next = TRADE_STEPS[currentIdx + 1]
      if (next) setStep(next)
    }, 1200)
  }

  function reset() {
    setStep(walletConnected ? 'approve usdc' : 'connect wallet')
    setAmount('')
  }

  const s = step as string
  const canAdvance = s !== 'claimed' && s !== 'curator executing' && (s === 'connect wallet' || (num > 0 && !loading))

  const actionLabel: Record<TradeStep, string> = {
    'connect wallet': 'CONNECT WALLET',
    'approve usdc': 'APPROVE USDC',
    request: mode === 'subscribe' ? 'SUBMIT REQUEST' : 'SUBMIT REDEMPTION',
    'curator executing': 'AWAITING CURATOR',
    'claim ready': 'CLAIM NOW',
    claimed: 'CLAIMED',
  }

  const actionBg: Partial<Record<TradeStep, string>> = {
    'connect wallet': 'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell',
    'approve usdc': 'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell',
    request: mode === 'subscribe' ? 'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell' : 'bg-ix-orange hover:opacity-90 text-ix-shell',
    'curator executing': 'bg-ix-panel text-ix-text-faint cursor-not-allowed',
    'claim ready': 'bg-ix-orange hover:opacity-90 text-ix-shell',
    claimed: 'bg-ix-panel text-ix-text-faint cursor-not-allowed',
  }

  return (
    <aside className="w-[264px] bg-ix-shell border-l border-ix-border flex flex-col shrink-0 overflow-y-auto max-md:hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ix-border">
        <span className="text-[8px] font-mono tracking-[0.25em] text-ix-text-faint uppercase">TRADE</span>
        <span className="text-[8px] font-mono text-ix-text-faint">{vault.label}</span>
      </div>

      <div className="flex border-b border-ix-border">
        {(['subscribe', 'redeem'] as TradeMode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); reset() }} className={cn('flex-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] border-r last:border-r-0 border-ix-border transition-colors', mode === m ? (m === 'subscribe' ? 'bg-ix-blue text-ix-shell font-medium' : 'bg-ix-orange text-ix-shell font-medium') : 'text-ix-text-faint hover:text-ix-text-muted hover:bg-ix-panel-warm')}>{m}</button>
        ))}
      </div>

      <div className="px-4 py-3.5 border-b border-ix-border">
        <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-2">TARGET VAULT</span>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] font-mono text-ix-text font-medium leading-none mb-1">{vault.label}</div>
            <div className="text-[10px] font-mono text-ix-text-muted">{vault.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-mono tabular text-ix-text-dim leading-none">NAV</div>
            <div className="text-[16px] font-mono tabular text-ix-text font-medium leading-none mt-1">{vault.nav.toFixed(4)}</div>
          </div>
        </div>
        {!isLive && <div className="mt-2 text-[8px] font-mono text-ix-orange uppercase tracking-[0.2em]">preview only - not tradeable</div>}
      </div>

      {isLive && (
        <div className="px-4 py-3.5 border-b border-ix-border">
          <label className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-2">{mode === 'subscribe' ? 'USDC AMOUNT' : 'SHARES TO REDEEM'}</label>
          <div className="flex items-center border border-ix-border bg-ix-panel-warm focus-within:border-ix-blue transition-colors">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" className="flex-1 bg-transparent px-3 py-3 text-[22px] font-mono tabular text-ix-text placeholder:text-ix-text-faint outline-none w-0" />
            <span className="px-3 text-[9px] font-mono text-ix-text-faint uppercase tracking-widest shrink-0 border-l border-ix-border py-3">{mode === 'subscribe' ? 'USDC' : 'SHR'}</span>
          </div>
        </div>
      )}

      {isLive && (
        <div className="px-4 py-3 border-b border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-2">QUOTE PREVIEW</span>
          <QuoteRow label="NAV USED" value={vault.nav.toFixed(4)} />
          {mode === 'subscribe' ? <QuoteRow label="EST. SHARES" value={estShares} accent="text-ix-text" /> : <QuoteRow label="EST. USDC OUT" value={estUsdc} accent="text-ix-text" />}
          <QuoteRow label="EXEC WINDOW" value="~15 min" />
          <QuoteRow label="REQUEST ID" value={num > 0 ? 'REQ-0042' : '—'} dim />
        </div>
      )}

      {isLive && (
        <div className="px-4 py-3.5 border-b border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-3">REQUEST STATE</span>
          <div className="flex flex-col gap-0">
            {TRADE_STEPS.map((s, i) => {
              const done = i < currentIdx
              const active = s === step
              const color = STEP_COLORS[s]
              return (
                <div key={s} className="flex items-center gap-2.5 py-[5px] relative">
                  {i < TRADE_STEPS.length - 1 && <div className="absolute left-[8px] top-[18px] w-px h-[calc(100%-2px)]" style={{ backgroundColor: done ? '#1E9E5A' : '#2A2823' }} />}
                  <div className={cn('size-[10px] shrink-0 flex items-center justify-center relative z-10 border', done ? 'bg-ix-green border-ix-green' : active ? 'border-current' : 'border-ix-border bg-ix-shell')} style={active ? { borderColor: color } : {}}>
                    {done && <span className="text-ix-shell" style={{ fontSize: 7, lineHeight: 1 }}>{'\u2713'}</span>}
                    {active && s === 'curator executing' && <Loader size={6} className="animate-spin" style={{ color }} />}
                    {active && s !== 'curator executing' && <div className="size-[4px]" style={{ backgroundColor: color }} />}
                  </div>
                  <span className="text-[10px] font-mono tracking-wider" style={{ color: done ? '#1E9E5A' : active ? color : '#4E4A42' }}>{STEP_LABELS[s]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="p-4 border-t border-ix-border">
        {isLive ? (
          <>
            <button onClick={advance} disabled={!canAdvance || loading} className={cn('w-full py-3.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors flex items-center justify-center gap-2', canAdvance && !loading ? (actionBg[step] ?? 'bg-ix-blue text-ix-shell') : 'bg-ix-panel text-ix-text-faint cursor-not-allowed')}>
              {loading ? <><Loader size={12} className="animate-spin" /> processing...</> : <>{actionLabel[step]}{canAdvance && step !== 'claimed' && <ChevronRight size={12} />}</>}
            </button>
            {step === 'claimed' && <button onClick={reset} className="w-full mt-2 py-2 text-[10px] font-mono uppercase tracking-widest text-ix-text-muted hover:text-ix-text transition-colors text-center">NEW REQUEST</button>}
          </>
        ) : (
          <div className="w-full py-3 text-[10px] font-mono uppercase tracking-[0.18em] text-ix-text-faint text-center border border-ix-border">PREVIEW ONLY / NOT TRADEABLE</div>
        )}
      </div>
    </aside>
  )
}

function QuoteRow({ label, value, dim, accent }: { label: string; value: string; dim?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ix-border-dim last:border-b-0">
      <span className="text-[8px] font-mono tracking-[0.18em] text-ix-text-faint uppercase">{label}</span>
      <span className={cn('text-[10px] font-mono tabular', dim ? 'text-ix-text-faint' : accent ?? 'text-ix-text-muted')}>{value}</span>
    </div>
  )
}
