import { useState, useEffect } from 'react';
import { FunctionSpaceProvider, useDistributionState } from '@functionspace/react';
import {
  ConsensusChart, TradePanel, MarketStats, PositionTable, AuthWidget,
  MarketCharts, ShapeCutter, BinaryPanel, TimelineChart, CustomShapeEditor,
  BucketRangeSelector,
} from '@functionspace/ui';
import { config, MARKET_ID } from './App';
import type { FSThemeInput } from '@functionspace/react';

const theme: FSThemeInput = 'fs-dark';

// Config without auto-auth so AuthWidget renders logged-out
const noAuthConfig = {
  ...config,
  autoAuthenticate: false,
  username: undefined,
  password: undefined,
};

function BasicTradingLayout() {
  return (
    <div data-capture="StarterKit_BasicTrading" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
          <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem', minHeight: '520px' }}>
          <div style={{ flex: 7, minWidth: 0 }}>
            <ConsensusChart marketId={MARKET_ID} height={655} zoomable />
          </div>
          <div style={{ flex: 3, minWidth: 0 }}>
            <TradePanel marketId={MARKET_ID} modes={['gaussian', 'range']} />
          </div>
        </div>
        <PositionTable marketId={MARKET_ID} username="" tabs={['open-orders', 'trade-history', 'market-positions']} />
      </FunctionSpaceProvider>
    </div>
  );
}

function BinaryPanelLayout() {
  return (
    <div data-capture="StarterKit_BinaryPanel" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
          <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <MarketCharts marketId={MARKET_ID} height={400} views={['consensus', 'distribution']} zoomable />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Static (locked at 91)</p>
            <BinaryPanel marketId={MARKET_ID} xPoint={{ mode: 'static', value: 91 }} />
          </div>
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Variable (user-editable)</p>
            <BinaryPanel marketId={MARKET_ID} xPoint={{ mode: 'variable' }} />
          </div>
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dynamic Mode (consensus peak)</p>
            <BinaryPanel marketId={MARKET_ID} xPoint={{ mode: 'dynamic-mode', allowOverride: true }} />
          </div>
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dynamic Mean (expected value)</p>
            <BinaryPanel marketId={MARKET_ID} xPoint={{ mode: 'dynamic-mean', allowOverride: true }} />
          </div>
        </div>
        <PositionTable marketId={MARKET_ID} username="" />
      </FunctionSpaceProvider>
    </div>
  );
}

function CustomShapeLayout() {
  return (
    <div data-capture="StarterKit_CustomShape" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
          <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <CustomShapeEditor marketId={MARKET_ID} zoomable />
        </div>
        <PositionTable marketId={MARKET_ID} username="" tabs={['open-orders', 'trade-history', 'market-positions']} />
      </FunctionSpaceProvider>
    </div>
  );
}

function DistRangeContent() {
  const distState = useDistributionState(MARKET_ID);
  return (
    <>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
        <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
      </div>
      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution']} distributionState={distState} zoomable />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <BucketRangeSelector marketId={MARKET_ID} distributionState={distState} />
      </div>
    </>
  );
}

function DistRangeLayout() {
  return (
    <div data-capture="StarterKit_DistRange" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <DistRangeContent />
      </FunctionSpaceProvider>
    </div>
  );
}

function ShapeCutterLayout() {
  return (
    <div data-capture="StarterKit_ShapeCutter" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
          <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <MarketCharts marketId={MARKET_ID} height={350} views={['consensus', 'distribution', 'timeline']} zoomable />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <ShapeCutter marketId={MARKET_ID} />
        </div>
        <PositionTable marketId={MARKET_ID} username="" tabs={['open-orders', 'trade-history', 'market-positions']} />
      </FunctionSpaceProvider>
    </div>
  );
}

function TimelineBinaryLayout() {
  return (
    <div data-capture="StarterKit_TimelineBinary" style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <FunctionSpaceProvider config={noAuthConfig} theme={theme}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 7, minWidth: 0 }}><MarketStats marketId={MARKET_ID} /></div>
          <div style={{ flex: 3, minWidth: 0 }}><AuthWidget /></div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <TimelineChart marketId={MARKET_ID} height={500} zoomable />
        </div>
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <BinaryPanel marketId={MARKET_ID} xPoint={{ mode: 'dynamic-mean' }} />
        </div>
      </FunctionSpaceProvider>
    </div>
  );
}

// ── Hash Router ──

const LAYOUTS: Record<string, () => JSX.Element> = {
  'basic':            BasicTradingLayout,
  'binary':           BinaryPanelLayout,
  'custom-shape':     CustomShapeLayout,
  'dist-range':       DistRangeLayout,
  'shape-cutter':     ShapeCutterLayout,
  'timeline-binary':  TimelineBinaryLayout,
};

export default function App_StarterKitCapture() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || 'basic');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || 'basic');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const Layout = LAYOUTS[route];
  if (!Layout) {
    return <div style={{ padding: '2rem', color: '#fff', background: '#0a0a0f' }}>
      <h2>Unknown route: #{route}</h2>
      <p>Available: {Object.keys(LAYOUTS).map(k => `#${k}`).join(', ')}</p>
    </div>;
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <Layout />
    </div>
  );
}
