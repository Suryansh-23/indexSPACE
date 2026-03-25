import React from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { FunctionSpaceProvider, useMarkets } from '@functionspace/react';
import { MarketList } from '@functionspace/ui';
import { config, widgetTheme } from './App';

// ── Swap trading layout by changing this import ──
import { BasicTradingLayout as TradingLayout } from './App_BasicTradingLayout';
// import { ShapeCutterTradingLayout as TradingLayout } from './App_ShapeCutterTradingLayout';
// import { DistRangeLayout as TradingLayout } from './App_DistRange';
// import { BinaryPanelLayout as TradingLayout } from './App_BinaryPanel';
// import { CustomShapeLayout as TradingLayout } from './App_CustomShapeLayout';
// import { TimelineBinaryLayout as TradingLayout } from './App_TimelineBinaryTradingLayout';

// ── Market List Page ──

function MarketListPage() {
  const navigate = useNavigate();
  const { markets, loading, error } = useMarkets({
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
    pollInterval: 5000,
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: 'var(--fs-text)', marginBottom: '1.5rem', fontFamily: 'inherit' }}>Markets</h1>
      <MarketList markets={markets} loading={loading} error={error} onSelect={(id) => navigate(`/trade/${id}`)} />
    </div>
  );
}

// ── Trading Page ──

function TradingPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const numericId = Number(marketId);

  if (isNaN(numericId)) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <p style={{ color: 'var(--fs-negative)' }}>Invalid market ID: &quot;{marketId}&quot;</p>
        <button
          onClick={() => navigate('/')}
          style={{
            color: 'var(--fs-primary)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
          }}
        >
          &larr; Back to Markets
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          color: 'var(--fs-text-secondary)',
          marginBottom: '1rem',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          fontSize: '0.9rem',
          fontFamily: 'inherit',
        }}
      >
        &larr; Back to Markets
      </button>
      <TradingLayout marketId={numericId} />
    </div>
  );
}

// ── Default Export (provider wraps outside router so hooks work on all routes) ──

export default function App_MarketDiscoveryRouted() {
  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketListPage />} />
          <Route path="/trade/:marketId" element={<TradingPage />} />
        </Routes>
      </BrowserRouter>
    </FunctionSpaceProvider>
  );
}
