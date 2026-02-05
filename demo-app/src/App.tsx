import { useState, useMemo } from 'react';
import { FunctionSpaceProvider, useMarket, usePositions } from '@functionspace/react';
import type { FSThemeInput } from '@functionspace/react';
import { ConsensusChart, TradePanel, MarketStats, PositionTable } from '@functionspace/ui';
import type { OverlayCurve } from '@functionspace/ui';
import { evaluateDensityCurve } from '@functionspace/core';
import { ArticlePage } from './pages/ArticlePage';

const config = {
  baseUrl: import.meta.env.VITE_FS_BASE_URL,
  username: import.meta.env.VITE_FS_USERNAME,
  password: import.meta.env.VITE_FS_PASSWORD,
};

const MARKET_ID = import.meta.env.VITE_FS_MARKET_ID;

// ── Theme Options ──
const widgetTheme: FSThemeInput = "dark";

// ── Layout Settings ──
const CHART_RATIO = 2.2;
const PANEL_RATIO = 1;

// Inner component that uses hooks (must be inside FunctionSpaceProvider)
function MarketWidgets() {
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);

  const { market } = useMarket(MARKET_ID);
  const { positions } = usePositions(MARKET_ID, config.username);

  // Derive overlay curve from selected position
  const overlayCurves = useMemo((): OverlayCurve[] | undefined => {
    if (!selectedPositionId || !positions || !market) return undefined;
    const pos = positions.find(p => p.positionId === selectedPositionId);
    if (!pos?.belief) return undefined;

    const { L, H } = market.config;
    const curve = evaluateDensityCurve(pos.belief, L, H, 100);

    return [{
      id: `position-${selectedPositionId}`,
      label: `Position #${selectedPositionId}`,
      curve,
      color: '#10b981',
    }];
  }, [selectedPositionId, positions, market]);

  return (
    <>
      <MarketStats marketId={MARKET_ID} />

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
        <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
          <ConsensusChart marketId={MARKET_ID} height={600} overlayCurves={overlayCurves} />
        </div>
        <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
          <TradePanel marketId={MARKET_ID} modes={['gaussian', 'plateau']} />
        </div>
      </div>

      <PositionTable
        marketId={MARKET_ID}
        username={config.username}
        selectedPositionId={selectedPositionId}
        onSelectPosition={setSelectedPositionId}
      />
    </>
  );
}

export default function App() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketWidgets />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
