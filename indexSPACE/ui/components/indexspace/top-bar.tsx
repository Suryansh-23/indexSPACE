'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  networkOk: boolean
  walletConnected: boolean
  onConnectWallet: () => void
  onOpenPortfolio: () => void
}

function useClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return { time, date }
}

export function TopBar({ networkOk, walletConnected, onConnectWallet, onOpenPortfolio }: TopBarProps) {
  const { time, date } = useClock()

  return (
    <header className="h-11 bg-ix-shell border-b border-ix-border flex items-stretch shrink-0">
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

      <div className="flex items-stretch border-r border-ix-border">
        <StatusCell label="NETWORK" value={networkOk ? 'ONLINE' : 'OFFLINE'} ledColor={networkOk ? 'bg-ix-green' : 'bg-ix-red'} />
        <StatusCell label="INDEXER" value="BLK 48,291" ledColor="bg-ix-green" />
        <StatusCell label="SIMULATOR" value="2/4 ON" ledColor="bg-ix-yellow" pulse />
        <StatusCell label="VAULTS" value="2 LIVE / 2 PRV" ledColor="bg-ix-blue" />
      </div>

      <div className="flex-1" />

      <div className="flex items-stretch">
        <div className="flex flex-col justify-center items-end px-4 border-l border-ix-border">
          <span className="text-[12px] font-mono tabular text-ix-text leading-none">{time}</span>
          <span className="text-[8px] font-mono text-ix-text-muted leading-none mt-[3px] tracking-wider">{date}</span>
        </div>

        <button
          onClick={onOpenPortfolio}
          className="flex items-center gap-2.5 px-5 border-l border-ix-border text-[10px] font-mono text-ix-text-muted hover:text-ix-text hover:bg-ix-panel transition-colors uppercase tracking-widest"
        >
          <span className="size-1.5 bg-ix-text-faint shrink-0" />
          ACCOUNT
        </button>

        <button
          onClick={onConnectWallet}
          className={cn(
            'flex items-center gap-2.5 px-5 border-l border-ix-border text-[10px] font-mono uppercase tracking-widest transition-colors',
            walletConnected
              ? 'text-ix-green hover:bg-ix-panel'
              : 'text-ix-shell bg-ix-blue hover:bg-ix-blue-dim'
          )}
        >
          <span className={cn('size-1.5 shrink-0', walletConnected ? 'bg-ix-green' : 'bg-[#005fa3]',
            walletConnected && 'led-pulse'
          )} />
          {walletConnected ? '0x4f2a...8c1d' : 'CONNECT WALLET'}
        </button>
      </div>
    </header>
  )
}

function StatusCell({ label, value, ledColor, pulse }: { label: string; value: string; ledColor: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 border-r border-ix-border">
      <div className={cn('size-[5px] shrink-0', ledColor, pulse && 'led-pulse')} />
      <div className="flex flex-col gap-[3px]">
        <span className="text-[8px] font-mono tracking-[0.2em] text-ix-text-faint uppercase leading-none">{label}</span>
        <span className="text-[10px] font-mono text-ix-text-dim leading-none tabular">{value}</span>
      </div>
    </div>
  )
}
