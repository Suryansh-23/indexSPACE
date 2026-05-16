'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TopBarProps {
  networkOk: boolean
  onOpenPortfolio: () => void
}

export function TopBar({ networkOk, onOpenPortfolio }: TopBarProps) {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [noWallet, setNoWallet] = useState(false)

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null

  function handleWalletClick() {
    if (isConnected) {
      disconnect()
      return
    }
    if (typeof window === 'undefined' || !window.ethereum) {
      setNoWallet(true)
      setTimeout(() => setNoWallet(false), 3000)
      return
    }
    setNoWallet(false)
    connect({ connector: injected() })
  }

  return (
    <header className="h-11 bg-ix-shell border-b border-ix-border flex items-stretch shrink-0">

      {/* ── Brand mark ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 border-r border-ix-border min-w-[196px]">
        <div className="flex flex-col leading-none gap-[3px]">
          <span className="text-[11px] font-mono font-medium tracking-[0.18em] text-ix-text">
            INDEX<span className="text-ix-blue">SPACE</span>
          </span>
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-muted uppercase">
            FORECAST INDEX TERMINAL
          </span>
        </div>
        <div className="w-px h-5 bg-ix-border ml-1" />
        <div className="flex flex-col leading-none gap-[3px]">
          <span className="text-[8px] font-mono text-ix-text-faint tracking-widest uppercase">NET</span>
          <span className="text-[9px] font-mono text-ix-yellow tracking-wider">BASE SEPOLIA</span>
        </div>
      </div>

      {/* ── Status module strip ─────────────────────────────────────────────── */}
      <div className="flex items-stretch border-r border-ix-border">
        <StatusCell
          label="NETWORK"
          value={networkOk ? 'ONLINE' : 'OFFLINE'}
          ledColor={networkOk ? 'bg-ix-green' : 'bg-ix-red'}
          pulse={false}
        />
        <StatusCell
          label="INDEXER"
          value="BLK 48,291"
          ledColor="bg-ix-green"
          pulse={false}
        />
        <StatusCell
          label="SIMULATOR"
          value="03 / 04 ON"
          ledColor="bg-ix-yellow"
          pulse
        />
        <StatusCell
          label="VAULTS"
          value="2 LIVE / 2 PRV"
          ledColor="bg-ix-blue"
          pulse={false}
        />
      </div>

      {/* ── Spacer ──────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right controls ─────────────────────────────────────────────────── */}
      <div className="flex items-stretch">
        {/* Clock */}
        <div className="flex flex-col justify-center items-end px-4 border-l border-ix-border">
          <span className="text-[12px] font-mono tabular text-ix-text leading-none">{timeStr}</span>
          <span className="text-[8px] font-mono text-ix-text-muted leading-none mt-[3px] tracking-wider">{dateStr}</span>
        </div>

        {/* Portfolio / account console */}
        <button
          onClick={onOpenPortfolio}
          className="flex items-center gap-2.5 px-5 border-l border-ix-border text-[10px] font-mono text-ix-text-muted hover:text-ix-text hover:bg-ix-panel transition-colors uppercase tracking-widest"
        >
          <span className="w-1.5 h-1.5 bg-ix-text-faint shrink-0" />
          ACCOUNT
        </button>

        {/* Wallet */}
        <button
          onClick={handleWalletClick}
          disabled={isPending}
          className={cn(
            'flex items-center gap-2.5 px-5 border-l border-ix-border text-[10px] font-mono uppercase tracking-widest transition-colors disabled:opacity-60',
            noWallet
              ? 'text-ix-red bg-ix-shell'
              : isConnected
                ? 'text-ix-green hover:bg-ix-panel'
                : 'text-ix-shell bg-ix-blue hover:bg-ix-blue-dim'
          )}
        >
          <span className={cn(
            'w-1.5 h-1.5 shrink-0',
            noWallet ? 'bg-ix-red' : isConnected ? 'bg-ix-green' : 'bg-[#005fa3]',
            isConnected && 'led-pulse'
          )} />
          {noWallet
            ? 'NO WALLET'
            : isPending
              ? 'CONNECTING...'
              : isConnected && shortAddress
                ? shortAddress
                : 'CONNECT WALLET'}
        </button>
      </div>
    </header>
  )
}

function StatusCell({
  label,
  value,
  ledColor,
  pulse,
}: {
  label: string
  value: string
  ledColor: string
  pulse: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 border-r border-ix-border">
      <div className={cn('w-[5px] h-[5px] shrink-0', ledColor, pulse && 'led-pulse')} />
      <div className="flex flex-col gap-[3px]">
        <span className="text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase leading-none">
          {label}
        </span>
        <span className="text-[10px] font-mono text-ix-text-dim leading-none tabular">
          {value}
        </span>
      </div>
    </div>
  )
}
