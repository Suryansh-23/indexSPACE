'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import type { NavPoint, Vault } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type Range = '1H' | '6H' | '1D' | '1W' | 'ALL'
type ChartMode = 'NAV' | 'INDEX'

const RANGES: Range[] = ['1H', '6H', '1D', '1W', 'ALL']

function sliceHistory(data: NavPoint[], range: Range): NavPoint[] {
  const pts: Record<Range, number> = { '1H': 5, '6H': 30, '1D': 60, '1W': 90, 'ALL': data.length }
  return data.slice(-pts[range])
}

interface IndexChartProps {
  vault: Vault
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NavPoint
  return (
    <div className="bg-ix-shell border border-ix-border px-3 py-2">
      <div className="text-[8px] font-mono text-ix-text-faint mb-1 tracking-wider">
        {new Date(d.ts).toLocaleTimeString('en-US', { hour12: false })}
      </div>
      <div className="text-[13px] font-mono tabular text-ix-text">
        {d.nav.toFixed(4)}
      </div>
      <div className="text-[9px] font-mono tabular text-ix-text-muted mt-0.5">
        {d.shares.toLocaleString()} shares
      </div>
    </div>
  )
}

export function IndexChart({ vault }: IndexChartProps) {
  const [range, setRange] = useState<Range>('1D')
  const [mode, setMode] = useState<ChartMode>('NAV')
  const data = sliceHistory(vault.navHistory, range)
  const isUp = vault.navChange >= 0
  const isPreview = vault.status === 'preview'
  const lineColor = isPreview ? '#F05A24' : isUp ? '#1E9E5A' : '#D62D20'
  const minNav = Math.min(...data.map((d) => d.nav))
  const maxNav = Math.max(...data.map((d) => d.nav))
  const navPad = Math.max((maxNav - minNav) * 0.2, 0.002)

  return (
    <div className="flex flex-col h-full bg-ix-panel">

      {/* ── Chart identity header ─────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-start justify-between">
          {/* Left: vault identity + NAV headline */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-mono tracking-[0.22em] text-ix-text-faint uppercase">
                {vault.label}
              </span>
              <span className="text-ix-border-bright font-mono text-[9px]">/</span>
              <span className="text-[9px] font-mono tracking-widest text-ix-text-muted uppercase">
                {vault.name}
              </span>
              {isPreview && (
                <span className="text-[8px] font-mono text-ix-orange border border-ix-orange px-1.5 py-px tracking-widest">
                  SIMULATOR ON
                </span>
              )}
            </div>

            {/* NAV headline */}
            <div className="flex items-baseline gap-3">
              <span className="text-[32px] font-mono tabular font-medium text-ix-text leading-none">
                {vault.nav.toFixed(4)}
              </span>
              <div className="flex flex-col gap-[3px]">
                <span
                  className="text-[13px] font-mono tabular leading-none"
                  style={{ color: vault.navChange === 0 ? '#4E4A42' : isUp ? '#1E9E5A' : '#D62D20' }}
                >
                  {vault.navChange === 0
                    ? '0.00%'
                    : `${isUp ? '+' : ''}${vault.navChange.toFixed(2)}%`}
                </span>
                <span className="text-[8px] font-mono text-ix-text-faint tracking-widest uppercase">24H CHANGE</span>
              </div>
            </div>
          </div>

          {/* Right: stat cells */}
          <div className="flex items-start gap-px">
            <ChartStatCell label="GROSS NAV" value={vault.nav.toFixed(4)} />
            <ChartStatCell label="IDLE USDC" value={`$${(vault.usdc * 0.08).toFixed(0)}`} />
            <ChartStatCell label="FS EXPOSURE" value={`$${(vault.usdc * 0.92).toFixed(0)}`} />
            <ChartStatCell label="CLAIMABLE" value="1" accent="text-ix-orange" />
          </div>
        </div>
      </div>

      {/* ── Chart controls ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 mt-2 border-t border-b border-ix-border-dim shrink-0">
        {/* Range selector */}
        <div className="flex items-center gap-px">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors',
                range === r
                  ? 'bg-ix-blue text-ix-shell'
                  : 'text-ix-text-muted hover:text-ix-text'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-px">
          {(['NAV', 'INDEX'] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors border',
                mode === m
                  ? 'border-ix-border-bright text-ix-text-dim'
                  : 'border-transparent text-ix-text-faint hover:text-ix-text-muted'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`navGrad-${vault.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                <stop offset="75%" stopColor={lineColor} stopOpacity={0.04} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#1E1D1A"
              strokeWidth={1}
            />
            <XAxis
              dataKey="ts"
              tickFormatter={(v) =>
                new Date(v).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
              }
              tick={{ fill: '#4E4A42', fontSize: 8, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#2A2823' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minNav - navPad, maxNav + navPad]}
              tick={{ fill: '#4E4A42', fontSize: 8, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(4)}
              width={54}
            />
            <ReferenceLine
              y={1.0}
              stroke="#3A3830"
              strokeDasharray="4 4"
              label={{
                value: 'PAR 1.0000',
                position: 'insideTopRight',
                fill: '#4E4A42',
                fontSize: 8,
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="nav"
              stroke={lineColor}
              strokeWidth={1.5}
              fill={`url(#navGrad-${vault.id})`}
              dot={false}
              activeDot={{ r: 3, fill: lineColor, stroke: '#050505', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ChartStatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-[3px] px-3 border-l border-ix-border-dim">
      <span className="text-[8px] font-mono tracking-[0.18em] text-ix-text-faint uppercase leading-none">
        {label}
      </span>
      <span className={cn('text-[11px] font-mono tabular leading-none', accent ?? 'text-ix-text-dim')}>
        {value}
      </span>
    </div>
  )
}
