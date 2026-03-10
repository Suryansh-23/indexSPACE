import React from 'react';
import { MarketStats, AuthWidget, MarketCharts, ShapeCutter, PositionTable } from '@functionspace/ui';
import { DEMO_MARKET_ID, DEMO_USERNAME } from '../../constants';

export default function ShapeCutterDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <MarketCharts
        marketId={DEMO_MARKET_ID}
        views={['consensus', 'distribution', 'timeline']}
        zoomable
        height={350}
      />
      <ShapeCutter marketId={DEMO_MARKET_ID} />
      <PositionTable marketId={DEMO_MARKET_ID} username={DEMO_USERNAME} />
    </div>
  );
}
