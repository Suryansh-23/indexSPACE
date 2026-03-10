import React from 'react';
import { MarketStats, AuthWidget, CustomShapeEditor, PositionTable } from '@functionspace/ui';
import { DEMO_MARKET_ID, DEMO_USERNAME } from '../../constants';

export default function CustomShapeDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <CustomShapeEditor marketId={DEMO_MARKET_ID} zoomable />
      <PositionTable marketId={DEMO_MARKET_ID} username={DEMO_USERNAME} />
    </div>
  );
}
