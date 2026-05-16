'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ActivityEntry } from '@/lib/types'
import { ACTIVITY } from '@/lib/mock-data'
import { getVaultRequests, getVault } from '@/lib/indexspace-api'

const LIVE_VAULTS = [
  { id: 'ai-acceleration',    label: 'VAULT 01', name: 'AI ACCELERATION',    color: '#0071BB' },
  { id: 'crypto-reflexivity', label: 'VAULT 02', name: 'CRYPTO REFLEXIVITY', color: '#F05A24' },
]

type PortfolioTab = 'portfolio' | 'requests' | 'activity'

interface PortfolioDrawerProps {
  open: boolean
  onClose: () => void
  walletConnected: boolean
}

export function PortfolioDrawer({ open, onClose, walletConnected }: PortfolioDrawerProps) {
  const { address, chain } = useAccount()
  const [tab, setTab] = useState<PortfolioTab>('portfolio')
  const [liveActivity, setLiveActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function fetchActivity() {
      const all: ActivityEntry[] = []
      for (const vc of LIVE_VAULTS) {
        const rows = (await getVaultRequests(vc.id)) as any[]
        for (const r of rows) {
          all.push({
            id: String(r.id),
            ts: r.created_at ?? new Date().toISOString(),
            type: r.kind === 'subscribe' ? 'subscribe' : 'redeem',
            vault: vc.label,
            amount: r.kind === 'subscribe'
              ? `${parseFloat(r.asset_amount ?? '0').toFixed(2)} USDC`
              : `${parseFloat(r.share_amount ?? '0').toFixed(4)} shrs`,
            state: r.status,
            user: r.controller ? `${r.controller.slice(0, 6)}...${r.controller.slice(-4)}` : undefined,
          })
        }
      }
      all.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      if (!cancelled) setLiveActivity(all.slice(0, 30))
    }

    fetchActivity()
    return () => { cancelled = true }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/70" onClick={onClose} />

      {/* Drawer */}
      <aside className="w-[360px] bg-ix-shell border-l border-ix-border flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ix-border">
          <div>
            <div className="text-[11px] font-mono font-medium text-ix-text tracking-wider uppercase">
              ACCOUNT CONSOLE
            </div>
            <div className="text-[8px] font-mono text-ix-text-faint tracking-[0.2em] mt-[3px]">
              {walletConnected && address
                ? `${address.slice(0, 6)}...${address.slice(-4)}  /  ${chain?.name?.toUpperCase() ?? 'UNKNOWN'}`
                : 'NO WALLET CONNECTED'}
            </div>
          </div>
          <button onClick={onClose} className="text-ix-text-faint hover:text-ix-text transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ix-border">
          {(['portfolio', 'requests', 'activity'] as PortfolioTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-[9px] font-mono uppercase tracking-[0.18em] border-r last:border-r-0 border-ix-border transition-colors',
                tab === t
                  ? 'bg-ix-panel text-ix-text border-b-2 border-b-ix-blue'
                  : 'text-ix-text-faint hover:text-ix-text-muted hover:bg-ix-panel-warm'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!walletConnected ? (
            <DisconnectedState />
          ) : (
            <>
              {tab === 'portfolio' && <PortfolioContent />}
              {tab === 'requests'  && <RequestsContent />}
              {tab === 'activity'  && <ActivityContent entries={liveActivity} />}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

// ── Disconnected state ────────────────────────────────────────────────────────

function DisconnectedState() {
  return (
    <div className="p-6">
      {/* Account glyph */}
      <div className="flex flex-col gap-px mb-8 mt-4">
        {[3, 5, 4, 3, 5, 2].map((w, i) => (
          <div key={i} className="flex gap-px">
            {Array.from({ length: 6 }, (_, j) => (
              <div
                key={j}
                className={cn('h-[3px] w-[10px]', j < w ? 'bg-ix-border-bright' : 'bg-transparent')}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="text-[11px] font-mono text-ix-text font-medium mb-1 tracking-wider">ACCOUNT CONSOLE</div>
      <div className="text-[10px] font-mono text-ix-text-muted mb-4 leading-relaxed">
        Connect wallet to inspect shares, requests, and claimable assets.
      </div>

      <div className="border border-ix-border px-3 py-2.5 mb-6">
        <div className="text-[8px] font-mono text-ix-text-faint tracking-[0.2em] uppercase mb-2">VAULT SHARES</div>
        {['VAULT 01 / AI ACCELERATION', 'VAULT 02 / CRYPTO REFLEXIVITY'].map((v) => (
          <div key={v} className="flex items-center justify-between py-1.5 border-b border-ix-border-dim last:border-b-0">
            <span className="text-[9px] font-mono text-ix-text-muted">{v}</span>
            <span className="text-[9px] font-mono text-ix-text-faint">— shares</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="w-[5px] h-[5px] bg-ix-text-faint" />
        <span className="text-[9px] font-mono text-ix-text-faint uppercase tracking-widest">
          Base Sepolia testnet
        </span>
      </div>
    </div>
  )
}

// ── Portfolio tab ─────────────────────────────────────────────────────────────

function PortfolioContent() {
  const { address } = useAccount()
  type HoldingRow = { id: string; label: string; name: string; color: string; shares: number; nav: number; claimable: number }
  const [holdings, setHoldings] = useState<HoldingRow[]>([])

  useEffect(() => {
    if (!address) return
    let cancelled = false

    async function load() {
      const rows: HoldingRow[] = []
      for (const vc of LIVE_VAULTS) {
        const [requests, vaultData] = await Promise.all([
          getVaultRequests(vc.id, address!),
          getVault(vc.id),
        ])
        const nav = vaultData?.nav ?? 1
        const raw = requests as any[]
        const subShares = raw
          .filter((r) => r.kind === 'subscribe' && ['claimable', 'claimed'].includes(r.status))
          .reduce((s, r) => s + parseFloat(r.share_amount ?? '0'), 0)
        const rdmShares = raw
          .filter((r) => r.kind === 'redeem' && ['claimable', 'claimed'].includes(r.status))
          .reduce((s, r) => s + parseFloat(r.share_amount ?? '0'), 0)
        const claimable = raw.filter((r) => r.status === 'claimable').length
        rows.push({ ...vc, shares: Math.max(0, subShares - rdmShares), nav, claimable })
      }
      if (!cancelled) setHoldings(rows)
    }

    load()
    return () => { cancelled = true }
  }, [address])

  const total = holdings.reduce((s, h) => s + h.shares * h.nav, 0)
  const totalClaimable = holdings.reduce((s, h) => s + h.claimable, 0)

  return (
    <div>
      <div className="px-5 py-4 border-b border-ix-border">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-1.5">TOTAL VAULT VALUE</div>
        <div className="text-[28px] font-mono tabular text-ix-text font-medium leading-none">${total.toFixed(2)}</div>
        <div className="text-[9px] font-mono text-ix-text-muted mt-1 tracking-wider">≈ USDC / BASE SEPOLIA</div>
      </div>

      <div className="px-5 pt-4">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">VAULT SHARES</div>
        {holdings.map((h) => (
          <div key={h.id} className="py-3.5 border-b border-ix-border-dim">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 shrink-0" style={{ backgroundColor: h.color }} />
                <span className="text-[12px] font-mono text-ix-text font-medium">{h.label}</span>
              </div>
              <span className="text-[13px] font-mono tabular text-ix-text">${(h.shares * h.nav).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pl-[11px]">
              <span className="text-[10px] font-mono text-ix-text-muted">{h.name}</span>
              <span className="text-[9px] font-mono tabular text-ix-text-faint">
                {h.shares > 0 ? `${h.shares.toFixed(4)} shrs @ ${h.nav.toFixed(4)}` : '— shares'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-ix-border">
        <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">WALLET</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-ix-text-muted">claimable requests</span>
          <span className={cn('text-[13px] font-mono tabular', totalClaimable > 0 ? 'text-ix-orange' : 'text-ix-text-faint')}>
            {totalClaimable}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-ix-text-muted">address</span>
          <span className="text-[9px] font-mono text-ix-text-faint">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Requests tab ──────────────────────────────────────────────────────────────

function RequestsContent() {
  const { address } = useAccount()
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    if (!address) return
    let cancelled = false

    async function load() {
      const all: any[] = []
      for (const vc of LIVE_VAULTS) {
        const rows = (await getVaultRequests(vc.id, address!)) as any[]
        for (const r of rows) all.push({ ...r, vaultLabel: vc.label })
      }
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      if (!cancelled) setRequests(all.slice(0, 20))
    }

    load()
    return () => { cancelled = true }
  }, [address])

  const stateConfig: Record<string, { color: string; label: string }> = {
    claimable:  { color: 'text-ix-orange', label: 'CLAIMABLE' },
    pending:    { color: 'text-ix-blue',   label: 'PENDING' },
    executing:  { color: 'text-ix-yellow', label: 'EXECUTING' },
    claimed:    { color: 'text-ix-green',  label: 'CLAIMED' },
    failed:     { color: 'text-ix-red',    label: 'FAILED' },
  }

  if (requests.length === 0) {
    return (
      <div className="px-5 pt-8 text-[9px] font-mono text-ix-text-faint text-center tracking-wider">
        {address ? 'NO REQUESTS FOUND' : 'CONNECT WALLET TO VIEW REQUESTS'}
      </div>
    )
  }

  return (
    <div className="px-5 pt-4">
      <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">ASYNC REQUESTS</div>
      {requests.map((r) => {
        const sc = stateConfig[r.status]
        const typeTag = r.kind === 'subscribe' ? 'SUB' : 'RDM'
        const amount = r.kind === 'subscribe'
          ? `${parseFloat(r.asset_amount ?? '0').toFixed(2)} USDC`
          : `${parseFloat(r.share_amount ?? '0').toFixed(4)} shrs`
        const relTime = getRelTime(r.created_at)

        return (
          <div key={r.id} className="py-3.5 border-b border-ix-border-dim">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('text-[8px] font-mono px-1.5 py-0.5 leading-none',
                  typeTag === 'SUB' ? 'bg-ix-blue text-ix-shell' : 'bg-ix-orange text-ix-shell'
                )}>{typeTag}</span>
                <span className="text-[10px] font-mono text-ix-text-faint tabular">#{r.id}</span>
              </div>
              <span className={cn('text-[9px] font-mono uppercase tracking-wider', sc?.color ?? 'text-ix-text-faint')}>
                {sc?.label ?? r.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-ix-text">{r.vaultLabel}</span>
                <span className="text-[10px] font-mono tabular text-ix-text-muted">{amount}</span>
              </div>
              <span className="text-[8px] font-mono text-ix-text-faint">{relTime}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityContent({ entries }: { entries: ActivityEntry[] }) {
  const stateColor: Record<string, string> = {
    executing:  'text-ix-yellow',
    pending:    'text-ix-blue',
    claim_ready:'text-ix-orange',
    claimed:    'text-ix-green',
    complete:   'text-ix-green',
    failed:     'text-ix-red',
    info:       'text-ix-text-faint',
  }
  const typeTags: Record<string, { tag: string; bg: string }> = {
    subscribe: { tag: 'SUB', bg: 'bg-ix-blue' },
    redeem:    { tag: 'RDM', bg: 'bg-ix-orange' },
    claim:     { tag: 'CLM', bg: 'bg-ix-green' },
    curator:   { tag: 'CUR', bg: 'bg-ix-yellow' },
    system:    { tag: 'SIM', bg: 'bg-ix-text-faint' },
  }

  if (entries.length === 0) {
    return (
      <div className="px-5 pt-8 text-[9px] font-mono text-ix-text-faint text-center tracking-wider">
        NO ACTIVITY YET
      </div>
    )
  }

  return (
    <div className="px-5 pt-4">
      <div className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase mb-3">EXECUTION LOG</div>
      {entries.map((e) => {
        const tt = typeTags[e.type] ?? typeTags.system
        return (
          <div key={e.id} className="py-2.5 border-b border-ix-border-dim flex items-start gap-3">
            <span className="text-[8px] font-mono text-ix-text-faint mt-0.5 w-8 tabular shrink-0">
              {getRelTime(e.ts)}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={cn('text-[8px] font-mono text-ix-shell px-1.5 py-[2px] leading-none', tt.bg)}>{tt.tag}</span>
                <span className="text-[10px] font-mono text-ix-text">{e.vault}</span>
                {e.amount && <span className="text-[9px] font-mono tabular text-ix-text-muted">{e.amount}</span>}
                {e.user   && <span className="text-[8px] font-mono text-ix-text-faint">{e.user}</span>}
              </div>
              <span className={cn('text-[8px] font-mono uppercase tracking-wider', stateColor[e.state] ?? 'text-ix-text-faint')}>
                {e.state.replace('_', ' ')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getRelTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}
