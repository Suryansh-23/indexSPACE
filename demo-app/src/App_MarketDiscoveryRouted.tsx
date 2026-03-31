import React from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketExplorer, TradePanel, MarketStats, ConsensusChart } from '@functionspace/ui';
import { config, widgetTheme } from './App';

// ── Market Explorer Page ──

function MarketExplorerPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ color: 'var(--fs-text)', marginBottom: '1.5rem', fontFamily: 'inherit' }}>Market Discovery (Routed)</h1>
      <MarketExplorer
        views={['cards', 'pulse', 'compact', 'gauge', 'split', 'table', 'heatmap', 'charts']}
        state="open"
        pollInterval={5000}
        onSelect={(id) => navigate(`/trade/${id}`)}
      />
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
      <MarketStats marketId={numericId} />
      <ConsensusChart marketId={numericId} height={350} zoomable />
      <TradePanel marketId={numericId} modes={['gaussian', 'range']} />
    </div>
  );
}

// ── Default Export (provider wraps outside router so hooks work on all routes) ──

export default function App_MarketDiscoveryRouted() {
  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketExplorerPage />} />
          <Route path="/trade/:marketId" element={<TradingPage />} />
        </Routes>
      </BrowserRouter>
    </FunctionSpaceProvider>
  );
}
