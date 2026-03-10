import React from 'react';
import { MarketStats, AuthWidget, ConsensusChart, TradePanel, PositionTable } from '@functionspace/ui';
import { DEMO_MARKET_ID, DEMO_USERNAME } from '../../constants';

export default function BasicTradingDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <MarketStats marketId={DEMO_MARKET_ID} />
        <AuthWidget />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '1rem' }}>
        <ConsensusChart marketId={DEMO_MARKET_ID} height={350} />
        <TradePanel marketId={DEMO_MARKET_ID} />
      </div>
      <PositionTable marketId={DEMO_MARKET_ID} username={DEMO_USERNAME} />
    </div>
  );
}
