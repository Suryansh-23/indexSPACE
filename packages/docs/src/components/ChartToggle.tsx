import React, { useState } from 'react';
import { ConsensusChart } from '@functionspace/ui';
import { DEMO_MARKET_ID } from '../constants';

interface ChartToggleProps {
  marketId?: string | number;
  height?: number;
}

export default function ChartToggle({ marketId = DEMO_MARKET_ID, height = 300 }: ChartToggleProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          background: 'var(--fs-surface)',
          color: 'var(--fs-text-secondary)',
          border: '1px solid var(--fs-border)',
          borderRadius: '4px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        {show ? 'Hide' : 'Show'} Consensus Chart
      </button>
      {show && (
        <div style={{ marginTop: '0.5rem' }}>
          <ConsensusChart marketId={marketId} height={height} />
        </div>
      )}
    </div>
  );
}
