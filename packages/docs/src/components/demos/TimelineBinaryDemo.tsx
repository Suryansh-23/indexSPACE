import React from 'react';
import { MarketStats, AuthWidget, TimelineChart, BinaryPanel } from '@functionspace/ui';
import { DEMO_MARKET_ID } from '../../constants';

export default function TimelineBinaryDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <TimelineChart marketId={DEMO_MARKET_ID} height={500} zoomable />
      <BinaryPanel marketId={DEMO_MARKET_ID} xPoint={{ mode: 'dynamic-mean', allowOverride: true }} />
    </div>
  );
}
