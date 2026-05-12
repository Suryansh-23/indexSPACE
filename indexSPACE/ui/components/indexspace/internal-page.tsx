'use client'

import { cn } from '@/lib/utils'

export function InternalPage() {
  return (
    <div className="min-h-dvh bg-ix-shell text-ix-text font-mono p-8">
      <h1 className="text-[11px] font-mono tracking-[0.25em] text-ix-text-faint uppercase mb-6">INTERNAL / MACHINE ROOM</h1>

      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-6">
        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">SYSTEM STATUS</h2>
          <div className="space-y-2">
            <StatusRow label="SERVER" value="ONLINE" color="text-ix-green" />
            <StatusRow label="INDEXER" value="BLK 48,291" color="text-ix-green" />
            <StatusRow label="CURATOR" value="ARMED" color="text-ix-green" />
            <StatusRow label="SIMULATOR" value="ON (2/4 INDICES)" color="text-ix-yellow" />
            <StatusRow label="FS SDK" value="NOT CONFIGURED" color="text-ix-text-faint" />
          </div>
        </section>

        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">VAULTS</h2>
          <div className="space-y-2">
            <StatusRow label="AI ACCELERATION" value="LIVE / ARMED" color="text-ix-green" />
            <StatusRow label="CRYPTO REFLEXIVITY" value="LIVE / ARMED" color="text-ix-green" />
            <StatusRow label="MACRO STRESS" value="PREVIEW" color="text-ix-yellow" />
            <StatusRow label="CREATOR MOMENTUM" value="PREVIEW" color="text-ix-yellow" />
          </div>
        </section>

        <section>
          <h2 className="text-[9px] font-mono tracking-[0.2em] text-ix-blue uppercase mb-3">CONFIG</h2>
          <div className="space-y-2">
            <StatusRow label="CHAIN" value="BASE SEPOLIA (84532)" color="text-ix-text-dim" />
            <StatusRow label="MOCK VAULT" value="ENABLED" color="text-ix-yellow" />
            <StatusRow label="RPC" value="mock" color="text-ix-text-faint" />
          </div>
        </section>
      </div>

      <div className="mt-8 border-t border-ix-border pt-6">
        <p className="text-[9px] font-mono text-ix-text-faint">
          This is a demo/operator surface. Backend must be running for live data.
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


