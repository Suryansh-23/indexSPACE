'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Vault, DetailTab } from '@/lib/types'

interface VaultDetailProps {
  vault: Vault
  chartSlot: React.ReactNode
}

export function VaultDetail({ vault, chartSlot }: VaultDetailProps) {
  const [tab, setTab] = useState<DetailTab>('chart')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 border-b border-ix-border bg-ix-shell overflow-x-auto">
        <Metric label="NAV" value={vault.nav.toFixed(4)} accent={vault.navChange >= 0 ? 'text-ix-green' : 'text-ix-red'} />
        <Metric label="24H CHANGE" value={`${vault.navChange >= 0 ? '+' : ''}${vault.navChange.toFixed(2)}%`} accent={vault.navChange >= 0 ? 'text-ix-green' : 'text-ix-red'} />
        <Metric label="USDC POOL" value={`$${vault.usdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <Metric label="SHARES" value={vault.shares.toLocaleString()} />
        <Metric label="CURATOR" value={vault.curatorState.toUpperCase()} led={vault.curatorState === 'armed' ? 'bg-ix-green' : vault.curatorState === 'executing' ? 'bg-ix-yellow led-pulse' : 'bg-ix-text-faint'} />
        <Metric label="SIM" value={vault.simulatorState.toUpperCase()} led={vault.simulatorState === 'on' ? 'bg-ix-orange led-pulse' : 'bg-ix-text-faint'} />
        <Metric label="CONSTITUENTS" value={String(vault.constituents.length)} />
      </div>

      <div className="flex shrink-0 border-b border-ix-border bg-ix-shell">
        {(['chart', 'constituents', 'methodology'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2.5 text-[9px] font-mono uppercase tracking-[0.2em] border-r border-ix-border transition-colors',
              tab === t
                ? 'bg-ix-panel text-ix-text border-b-2 border-b-ix-blue'
                : 'text-ix-text-faint hover:text-ix-text-muted hover:bg-ix-panel-warm'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'chart' && chartSlot}
        {tab === 'constituents' && <ConstituentsView vault={vault} />}
        {tab === 'methodology' && <MethodologyView vault={vault} />}
      </div>
    </div>
  )
}

function Metric({ label, value, accent, led }: { label: string; value: string; accent?: string; led?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 border-r border-ix-border min-w-[110px] shrink-0">
      {led && <div className={cn('size-[5px] shrink-0', led)} />}
      <div className="flex flex-col gap-[3px]">
        <span className="text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase leading-none">{label}</span>
        <span className={cn('text-[11px] font-mono tabular leading-none', accent ?? 'text-ix-text-dim')}>{value}</span>
      </div>
    </div>
  )
}

const WEIGHT_COLORS = ['#0071BB', '#F05A24', '#1E9E5A', '#FFC700', '#D62D20', '#8E8A80']

const BELIEF_GLYPHS: Record<string, string> = {
  bullish: '▲', bearish: '▼', 'stress up': '◆', 'stress down': '◇',
  neutral: '→', accelerating: '▲', 'tail widening': '↗',
}

const ROLE_GLYPH: Record<string, string> = {
  capital: '▲', capability: '◆', deployment: '⬒',
  liquidity: '●', macro: '⬡', adoption: '■',
}

function ConstituentsView({ vault }: { vault: Vault }) {
  const [sel, setSel] = useState<number | null>(null)
  const selected = sel !== null ? vault.constituents[sel] : null

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="flex items-center gap-6 px-5 py-3 border-b border-ix-border bg-ix-panel-warm overflow-x-auto">
          <Chip label="CONSTITUENTS" value={String(vault.constituents.length)} />
          {vault.status === 'live' && (
            <Chip label="WEIGHTED EXPOSURE" value={`$${vault.constituents.reduce((s, c) => s + parseFloat(c.exposure.replace(/[$,]/g, '') || '0'), 0).toFixed(0)}`} />
          )}
          <Chip label="DISPERSION" value="MEDIUM" accent="text-ix-yellow" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ix-border sticky top-0 bg-ix-panel">
                {['#', 'MARKET', 'WEIGHT', 'EXPOSURE', 'DIRECTION', 'ROLE', 'PREVIEW'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vault.constituents.map((c, i) => (
                <ConstituentRow key={i} c={c} idx={i} live={vault.status === 'live'} selected={sel === i} onSelect={() => setSel(sel === i ? null : i)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase">WEIGHT DISTRIBUTION</span>
          <div className="flex h-[6px] w-full overflow-hidden gap-px mt-2">
            {vault.constituents.map((c, i) => (
              <div key={i} className="h-full transition-opacity" style={{ width: `${c.weight}%`, backgroundColor: WEIGHT_COLORS[i % WEIGHT_COLORS.length], opacity: sel === null || sel === i ? 1 : 0.25 }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
            {vault.constituents.map((c, i) => (
              <button key={i} onClick={() => setSel(sel === i ? null : i)} className="flex items-center gap-1.5 group" aria-label={`select ${c.market}`}>
                <div className="size-2 shrink-0" style={{ backgroundColor: WEIGHT_COLORS[i % WEIGHT_COLORS.length] }} />
                <span className={cn('text-[9px] font-mono transition-colors', sel === i ? 'text-ix-text-dim' : 'text-ix-text-muted group-hover:text-ix-text-dim')}>{c.market}</span>
                <span className="text-[9px] font-mono tabular text-ix-text-faint">{c.weight}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="w-[220px] border-l border-ix-border bg-ix-panel-warm flex flex-col shrink-0 overflow-y-auto max-md:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ix-border">
            <span className="text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase">MARKET DETAIL</span>
            <button onClick={() => setSel(null)} aria-label="close detail" className="text-ix-text-faint hover:text-ix-text font-mono text-[10px]">✕</button>
          </div>
          <div className="px-4 pt-4 pb-2">
            <div className="text-[11px] font-mono font-medium text-ix-text mb-1 leading-tight">{selected.market}</div>
            <div className="text-[8px] font-mono tracking-widest uppercase mb-3" style={{ color: WEIGHT_COLORS[sel! % WEIGHT_COLORS.length] }}>{selected.weight}% WEIGHT</div>
            <DetailRow label="EXPOSURE" value={vault.status === 'live' ? selected.exposure : '—'} />
            <DetailRow label="PREVIEW P" value={selected.preview.toFixed(2)} />
            <DetailRow label="DIRECTION" value={`${BELIEF_GLYPHS[selected.belief] ?? '?'} ${selected.belief}`} />
            <DetailRow label="ROLE" value={`${ROLE_GLYPH[selected.role] ?? ''} ${selected.role.toUpperCase()}`} />
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-[3px] shrink-0">
      <span className="text-[8px] font-mono tracking-[0.18em] text-ix-text-faint uppercase">{label}</span>
      <span className={cn('text-[10px] font-mono tabular', accent ?? 'text-ix-text-dim')}>{value}</span>
    </div>
  )
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-[2px] py-2 border-b border-ix-border-dim">
      <span className="text-[8px] font-mono tracking-[0.18em] text-ix-text-faint uppercase">{label}</span>
      <span className={cn('text-[11px] font-mono', accent ?? 'text-ix-text-dim')}>{value}</span>
    </div>
  )
}

function ConstituentRow({ c, idx, live, selected, onSelect }: { c: Vault['constituents'][0]; idx: number; live: boolean; selected: boolean; onSelect: () => void }) {
  return (
    <tr onClick={onSelect} className={cn('border-b border-ix-border-dim cursor-pointer transition-colors', selected ? 'bg-ix-surface' : 'hover:bg-ix-panel-warm')}>
      <td className="px-4 py-3"><span className="text-[9px] font-mono tabular text-ix-text-faint">{String(idx + 1).padStart(2, '0')}</span></td>
      <td className="px-4 py-3"><span className="text-[11px] font-mono text-ix-text">{c.market}</span></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono tabular text-ix-text">{c.weight}%</span>
          <div className="w-14 h-[2px] bg-ix-border relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full" style={{ width: `${c.weight}%`, backgroundColor: WEIGHT_COLORS[idx % WEIGHT_COLORS.length] }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><span className="text-[11px] font-mono tabular text-ix-text-muted">{live ? c.exposure : '—'}</span></td>
      <td className="px-4 py-3"><span className="text-[10px] font-mono text-ix-text-muted">{BELIEF_GLYPHS[c.belief] ?? '?'} {c.belief}</span></td>
      <td className="px-4 py-3"><span className="text-[10px] font-mono text-ix-text-muted">{ROLE_GLYPH[c.role]} {c.role.toUpperCase()}</span></td>
      <td className="px-4 py-3"><span className="text-[11px] font-mono tabular text-ix-text">{c.preview.toFixed(2)}</span></td>
    </tr>
  )
}

function MethodologyView({ vault }: { vault: Vault }) {
  const modules = [
    {
      title: 'EXECUTION MODEL', code: 'MOD-01',
      body: 'Subscriptions and redemptions are async. A trusted curator monitors pending requests and executes the underlying FunctionSpace basket. Shares mint proportionally to deposited USDC divided by current NAV.',
    },
    {
      title: 'NAV CALCULATION', code: 'MOD-02',
      body: '(idle USDC + FS position value) / shares outstanding. Updated on each curator execution cycle.',
    },
    {
      title: 'CONSTITUENT SELECTION', code: 'MOD-03',
      body: 'Markets selected by curator based on narrative relevance, liquidity depth, and belief coherence on FunctionSpace markets. Weights reviewed on a rolling basis.',
    },
    {
      title: 'REQUEST LIFECYCLE', code: 'MOD-04',
      body: 'Wallet -> Approve -> Request -> Curator exec -> Claimable -> Claimed. Each step is gated by the previous completing before the next advances.',
    },
    {
      title: 'CURATOR ROLE', code: 'MOD-05',
      body: 'Curator is a privileged offchain account executing basket trades on FunctionSpace and triggering vault rebalancing. Trustless execution is deferred.',
    },
    {
      title: 'RISK / TRUST', code: 'MOD-06',
      body: 'FunctionSpace market exposure is offchain. Async delay between request and execution. NAV reflects last curator cycle, not real-time. Testnet only.',
    },
  ]

  return (
    <div className="p-5 grid grid-cols-2 gap-px bg-ix-border-dim max-md:grid-cols-1">
      {modules.map((m) => (
        <div key={m.code} className="bg-ix-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono tracking-[0.22em] text-ix-text-muted uppercase">{m.title}</span>
            <span className="text-[8px] font-mono text-ix-text-faint">{m.code}</span>
          </div>
          <p className="text-[10px] font-mono text-ix-text-muted leading-relaxed">{m.body}</p>
        </div>
      ))}
    </div>
  )
}
