'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseUnits } from 'viem'
import type { Address } from 'viem'
import { cn } from '@/lib/utils'
import { ChevronRight, Loader } from 'lucide-react'
import type { Vault, TradeMode } from '@/lib/types'
import { TRADE_STEPS, type TradeStep } from '@/lib/mock-data'
import { getVaultAddress, getUsdcAddress, getVaultAbi } from '@/lib/contracts'
import vaultAbiJson from '@/lib/IndexVault.json'
import { getVaultRequests } from '@/lib/indexspace-api'

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

interface TradeDrawerProps {
  vault: Vault
  walletConnected: boolean
}

const STEP_COLORS: Record<TradeStep, string> = {
  'connect wallet':    '#4E4A42',
  'approve usdc':      '#4E4A42',
  'request':           '#0071BB',
  'curator executing': '#FFC700',
  'claim ready':       '#F05A24',
  'claimed':           '#1E9E5A',
}

const STEP_LABELS_SHORT: Record<TradeStep, string> = {
  'connect wallet':    '01 WALLET',
  'approve usdc':      '02 APPROVE',
  'request':           '03 REQUEST',
  'curator executing': '04 CURATOR',
  'claim ready':       '05 CLAIMABLE',
  'claimed':           '06 CLAIMED',
}

export function TradeDrawer({ vault, walletConnected }: TradeDrawerProps) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { connect } = useConnect()

  const [mode, setMode] = useState<TradeMode>('subscribe')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<TradeStep>('connect wallet')
  const [error, setError] = useState<string | null>(null)

  const { writeContract, data: txHash, isPending: isSending, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  const isLive = vault.status === 'live'
  const usdcAmount = parseFloat(amount) || 0
  const sharesEstimate = usdcAmount > 0 ? (usdcAmount / vault.nav).toFixed(2) : '—'
  const usdcEstimate   = usdcAmount > 0 ? (usdcAmount * vault.nav).toFixed(2) : '—'
  const currentStepIdx = TRADE_STEPS.indexOf(step)
  const loading = isSending || isConfirming

  // Advance to next step after tx confirms
  useEffect(() => {
    if (!isConfirmed) return
    if (step === 'approve usdc') {
      setStep('request')
    } else if (step === 'request') {
      setStep('curator executing')
    } else if (step === 'claim ready') {
      setStep('claimed')
    }
    resetWrite()
  }, [isConfirmed, step, resetWrite])

  // Sync step with wallet connection state
  useEffect(() => {
    if (walletConnected && step === 'connect wallet') {
      setStep('approve usdc')
    } else if (!walletConnected) {
      setStep('connect wallet')
    }
  }, [walletConnected, step])

  // Poll backend for curator completion when in executing state
  const pollCurator = useCallback(async () => {
    if (!address) return
    try {
      const rows = await getVaultRequests(vault.id, address)
      const claimable = rows.find((r) => r.status === 'claimable')
      if (claimable) setStep('claim ready')
    } catch {
      // polling failure is non-fatal
    }
  }, [vault.id, address])

  useEffect(() => {
    if (step !== 'curator executing') return
    const id = setInterval(pollCurator, 8000)
    pollCurator()
    return () => clearInterval(id)
  }, [step, pollCurator])

  function resetFlow() {
    setStep(walletConnected ? 'approve usdc' : 'connect wallet')
    setAmount('')
    setError(null)
    resetWrite()
  }

  async function handleAction() {
    setError(null)
    try {
      if (step === 'connect wallet') {
        connect({ connector: injected() })
        return
      }

      const vaultAddress = getVaultAddress(vault.id, chainId)
      if (!vaultAddress) throw new Error('Vault not deployed on this network')

      if (step === 'approve usdc') {
        const usdcAddress = getUsdcAddress(chainId)
        if (!usdcAddress) throw new Error('USDC not available on this network')
        const approveAmt = mode === 'subscribe'
          ? parseUnits(usdcAmount.toString(), 6)
          : parseUnits((usdcAmount * vault.nav * 1.01).toFixed(6), 6)
        writeContract({
          address: usdcAddress,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [vaultAddress, approveAmt],
          account: address as Address,
        })
        return
      }

      if (step === 'request') {
        if (!address) return
        if (mode === 'subscribe') {
          writeContract({
            address: vaultAddress,
            abi: vaultAbiJson.abi as any,
            functionName: 'requestDeposit',
            args: [parseUnits(usdcAmount.toString(), 6), address, address],
            account: address,
          })
        } else {
          writeContract({
            address: vaultAddress,
            abi: vaultAbiJson.abi as any,
            functionName: 'requestRedeem',
            args: [parseUnits(usdcAmount.toString(), 18), address, address],
            account: address,
          })
        }
        return
      }

      if (step === 'claim ready') {
        if (!address) return
        const fn = mode === 'subscribe' ? 'claimDeposit' : 'claimRedeem'
        writeContract({
          address: vaultAddress,
          abi: vaultAbiJson.abi as any,
          functionName: fn,
          args: [address, address],
          account: address,
        })
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const canAdvance =
    step !== 'claimed' &&
    step !== 'curator executing' &&
    !loading &&
    (step === 'connect wallet' || step === 'approve usdc' || usdcAmount > 0)

  const actionLabel: Record<TradeStep, string> = {
    'connect wallet':    'CONNECT WALLET',
    'approve usdc':      'APPROVE USDC',
    'request':           mode === 'subscribe' ? 'SUBMIT REQUEST' : 'SUBMIT REDEMPTION',
    'curator executing': 'AWAITING CURATOR',
    'claim ready':       'CLAIM NOW',
    'claimed':           'CLAIMED',
  }

  const actionColor: Partial<Record<TradeStep, string>> = {
    'connect wallet':    'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell',
    'approve usdc':      'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell',
    'request':           mode === 'subscribe'
                           ? 'bg-ix-blue hover:bg-ix-blue-dim text-ix-shell'
                           : 'bg-ix-orange hover:opacity-90 text-ix-shell',
    'curator executing': 'bg-ix-panel text-ix-text-faint cursor-not-allowed',
    'claim ready':       'bg-ix-orange hover:opacity-90 text-ix-shell',
    'claimed':           'bg-ix-panel text-ix-text-faint cursor-not-allowed',
  }

  return (
    <aside className="w-[264px] bg-ix-shell border-l border-ix-border flex flex-col shrink-0 overflow-y-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ix-border">
        <span className="text-[8px] font-mono tracking-[0.25em] text-ix-text-faint uppercase">TRADE</span>
        <span className="text-[8px] font-mono text-ix-text-faint">{vault.label}</span>
      </div>

      {/* ── Mode selector ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-ix-border">
        {(['subscribe', 'redeem'] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); resetFlow() }}
            className={cn(
              'flex-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] border-r last:border-r-0 border-ix-border transition-colors',
              mode === m
                ? m === 'subscribe'
                  ? 'bg-ix-blue text-ix-shell font-medium'
                  : 'bg-ix-orange text-ix-shell font-medium'
                : 'text-ix-text-faint hover:text-ix-text-muted hover:bg-ix-panel-warm'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* ── Vault target block ────────────────────────────────────────────── */}
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
        {!isLive && (
          <div className="mt-2 text-[8px] font-mono text-ix-orange uppercase tracking-[0.2em]">
            preview only — not tradeable
          </div>
        )}
      </div>

      {/* ── Amount input ──────────────────────────────────────────────────── */}
      {isLive && (
        <div className="px-4 py-3.5 border-b border-ix-border">
          <label className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-2">
            {mode === 'subscribe' ? 'USDC AMOUNT' : 'SHARES TO REDEEM'}
          </label>
          <div className="flex items-center border border-ix-border bg-ix-panel-warm focus-within:border-ix-blue transition-colors">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              disabled={step === 'curator executing' || step === 'claim ready' || step === 'claimed'}
              className="flex-1 bg-transparent px-3 py-3 text-[22px] font-mono tabular text-ix-text placeholder:text-ix-text-faint outline-none w-0 disabled:opacity-40"
            />
            <span className="px-3 text-[9px] font-mono text-ix-text-faint uppercase tracking-widest shrink-0 border-l border-ix-border py-3">
              {mode === 'subscribe' ? 'USDC' : 'SHR'}
            </span>
          </div>
        </div>
      )}

      {/* ── Quote preview ─────────────────────────────────────────────────── */}
      {isLive && (
        <div className="px-4 py-3 border-b border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-2">QUOTE PREVIEW</span>
          <QuoteRow label="NAV USED" value={vault.nav.toFixed(4)} />
          {mode === 'subscribe'
            ? <QuoteRow label="EST. SHARES" value={sharesEstimate} accent="text-ix-text" />
            : <QuoteRow label="EST. USDC OUT" value={usdcEstimate} accent="text-ix-text" />}
          <QuoteRow label="EXEC WINDOW" value="~15 min" />
        </div>
      )}

      {/* ── Request lifecycle ─────────────────────────────────────────────── */}
      {isLive && (
        <div className="px-4 py-3.5 border-b border-ix-border">
          <span className="text-[8px] font-mono tracking-[0.22em] text-ix-text-faint uppercase block mb-3">REQUEST STATE</span>
          <div className="flex flex-col gap-0">
            {TRADE_STEPS.map((s, i) => {
              const done   = i < currentStepIdx
              const active = s === step
              const color  = STEP_COLORS[s]

              return (
                <div key={s} className="flex items-center gap-2.5 py-[5px] relative">
                  {i < TRADE_STEPS.length - 1 && (
                    <div
                      className="absolute left-[8px] top-[18px] w-px h-[calc(100%-2px)]"
                      style={{ backgroundColor: done ? '#1E9E5A' : '#2A2823' }}
                    />
                  )}
                  <div
                    className={cn(
                      'w-[10px] h-[10px] shrink-0 flex items-center justify-center relative z-10 border',
                      done   ? 'bg-ix-green border-ix-green' :
                      active ? 'border-current' : 'border-ix-border bg-ix-shell'
                    )}
                    style={active ? { borderColor: color } : {}}
                  >
                    {done && <span className="text-ix-shell" style={{ fontSize: 7, lineHeight: 1 }}>✓</span>}
                    {active && s === 'curator executing' && (
                      <Loader size={6} className="animate-spin" style={{ color }} />
                    )}
                    {active && s !== 'curator executing' && (
                      <div className="w-[4px] h-[4px]" style={{ backgroundColor: color }} />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-mono tracking-wider"
                    style={{ color: done ? '#1E9E5A' : active ? color : '#4E4A42' }}
                  >
                    {STEP_LABELS_SHORT[s]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Error display ─────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 border-b border-ix-border">
          <p className="text-[9px] font-mono text-ix-red leading-relaxed break-all">{error}</p>
        </div>
      )}

      <div className="flex-1" />

      {/* ── Action button ─────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-ix-border">
        {isLive ? (
          <>
            <button
              onClick={handleAction}
              disabled={!canAdvance}
              className={cn(
                'w-full py-3.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors flex items-center justify-center gap-2',
                canAdvance
                  ? actionColor[step] ?? 'bg-ix-blue text-ix-shell'
                  : 'bg-ix-panel text-ix-text-faint cursor-not-allowed'
              )}
            >
              {loading
                ? <><Loader size={12} className="animate-spin" /> processing...</>
                : <>{actionLabel[step]}{canAdvance && <ChevronRight size={12} />}</>}
            </button>
            {step === 'claimed' && (
              <button
                onClick={resetFlow}
                className="w-full mt-2 py-2 text-[10px] font-mono uppercase tracking-widest text-ix-text-muted hover:text-ix-text transition-colors text-center"
              >
                NEW REQUEST
              </button>
            )}
          </>
        ) : (
          <div className="w-full py-3 text-[10px] font-mono uppercase tracking-[0.18em] text-ix-text-faint text-center border border-ix-border">
            PREVIEW ONLY / NOT TRADEABLE
          </div>
        )}
      </div>
    </aside>
  )
}

function QuoteRow({ label, value, dim, accent }: { label: string; value: string; dim?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ix-border-dim last:border-b-0">
      <span className="text-[8px] font-mono tracking-[0.18em] text-ix-text-faint uppercase">{label}</span>
      <span className={cn('text-[10px] font-mono tabular', dim ? 'text-ix-text-faint' : accent ?? 'text-ix-text-muted')}>
        {value}
      </span>
    </div>
  )
}
