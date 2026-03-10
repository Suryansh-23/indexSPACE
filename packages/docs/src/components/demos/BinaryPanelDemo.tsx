import React, { useState } from 'react';
import { MarketStats, AuthWidget, MarketCharts, BinaryPanel, PositionTable } from '@functionspace/ui';
import { DEMO_MARKET_ID, DEMO_USERNAME } from '../../constants';

type XPointMode = 'static' | 'variable' | 'dynamic-mode' | 'dynamic-mean';

const MODES: { value: XPointMode; label: string }[] = [
  { value: 'static', label: 'Static (value=50)' },
  { value: 'variable', label: 'Variable' },
  { value: 'dynamic-mode', label: 'Dynamic Mode' },
  { value: 'dynamic-mean', label: 'Dynamic Mean' },
];

function getXPoint(mode: XPointMode) {
  switch (mode) {
    case 'static':
      return { mode: 'static' as const, value: 50 };
    case 'variable':
      return { mode: 'variable' as const };
    case 'dynamic-mode':
      return { mode: 'dynamic-mode' as const, allowOverride: true };
    case 'dynamic-mean':
      return { mode: 'dynamic-mean' as const, allowOverride: true };
  }
}

export default function BinaryPanelDemo() {
  const [mode, setMode] = useState<XPointMode>('static');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <MarketCharts marketId={DEMO_MARKET_ID} views={['consensus', 'distribution']} height={300} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: 'var(--fs-text-secondary)', fontSize: '0.875rem' }}>
          xPoint mode:
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as XPointMode)}
          style={{
            background: 'var(--fs-surface)',
            color: 'var(--fs-text)',
            border: '1px solid var(--fs-border)',
            borderRadius: '4px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.875rem',
          }}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <BinaryPanel marketId={DEMO_MARKET_ID} xPoint={getXPoint(mode)} />
      <PositionTable marketId={DEMO_MARKET_ID} username={DEMO_USERNAME} />
    </div>
  );
}
