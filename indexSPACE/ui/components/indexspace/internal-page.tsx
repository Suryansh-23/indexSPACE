'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getInternalStatus } from '@/lib/indexspace-api'

export function InternalPage() {
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    getInternalStatus().then(setStatus).catch(() => {})
  }, [])

  const online = status?.config?.fsConfigured !== undefined
  const mockMode = status?.config?.mockVault !== false

  return (
    <div className="min-h-dvh bg-ix-shell text-ix-text font-mono p-8">
      <h1 className="text-[11px] font-mono tracking-[0.25em] text-ix-text-faint uppercase mb-6">INTERNAL / MACHINE ROOM</h1>

      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-6">
        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">SYSTEM STATUS</h2>
          <div className="space-y-2">
            <StatusRow label="SERVER" value={online ? 'ONLINE' : 'OFFLINE'} color={online ? 'text-ix-green' : 'text-ix-red'} />
            <StatusRow label="BACKEND PORT" value={status?.config?.port ?? '?'} color="text-ix-text-dim" />
            <StatusRow label="MOCK VAULT" value={mockMode ? 'ENABLED' : 'DISABLED'} color={mockMode ? 'text-ix-yellow' : 'text-ix-green'} />
            <StatusRow label="FS SDK" value={status?.config?.fsConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'} color={status?.config?.fsConfigured ? 'text-ix-green' : 'text-ix-text-faint'} />
            <StatusRow label="SIMULATOR" value={status?.simulator?.enabled ? 'ON' : 'OFF'} color={status?.simulator?.enabled ? 'text-ix-yellow' : 'text-ix-text-faint'} />
          </div>
        </section>

        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">VAULTS</h2>
          <div className="space-y-2">
            <StatusRow label="AI ACCELERATION" value={mockMode ? 'MOCK' : 'LIVE'} color="text-ix-green" />
            <StatusRow label="CRYPTO REFLEXIVITY" value={mockMode ? 'MOCK' : 'LIVE'} color="text-ix-green" />
            <StatusRow label="MACRO STRESS" value="PREVIEW" color="text-ix-yellow" />
            <StatusRow label="CREATOR MOMENTUM" value="PREVIEW" color="text-ix-yellow" />
          </div>
        </section>

        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">DATABASE</h2>
          <div className="space-y-2">
            <StatusRow label="CHECKPOINTS" value={String(status?.db?.checkpoints ?? 0)} color="text-ix-text-dim" />
            <StatusRow label="REQUESTS" value={String(Array.isArray(status?.db?.requests) ? status.db.requests.length : 0)} color="text-ix-text-dim" />
            <StatusRow label="POSITIONS" value={String(Array.isArray(status?.db?.positions) ? status.db.positions.length : 0)} color="text-ix-text-dim" />
          </div>
        </section>
      </div>

      <div className="mt-8 border-t border-ix-border pt-6">
        <p className="text-[9px] font-mono text-ix-text-faint">
          {online ? 'Backend detected. Data reflects live system state.' : 'Backend unreachable. Start with: cd indexSPACE/backend && bun run dev'}
        </p>
      </div>
    </div>
  )
}

function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ix-border-dim py-1.5">
      <span className="text-[9px] font-mono text-ix-text-muted tracking-wider uppercase">{label}</span>
      <span className={cn('text-[10px] font-mono tabular', color)}>{value}</span>
    </div>
  )
}
