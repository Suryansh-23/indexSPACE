import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';

const DEMO_MARKET_ID = 23;

const WIDGET_CARDS = [
  {
    name: 'ConsensusChart',
    description: 'Probability density visualization with trade preview overlay',
    category: 'Charts',
    docPath: '/ui/charts/consensuschart',
    height: 280,
  },
  {
    name: 'DistributionChart',
    description: 'Bucket probability distribution bar chart with adjustable bucket count',
    category: 'Charts',
    docPath: '/ui/charts/distributionchart',
    height: 280,
  },
  {
    name: 'TimelineChart',
    description: 'Fan chart showing confidence interval bands over time',
    category: 'Charts',
    docPath: '/ui/charts/timelinechart',
    height: 280,
  },
  {
    name: 'TradePanel',
    description: 'Gaussian/range belief input with collateral, preview, and trade submission',
    category: 'Trading',
    docPath: '/ui/trade-inputs/tradepanel',
    height: 380,
  },
  {
    name: 'BinaryPanel',
    description: 'Yes/No binary trade input with configurable threshold modes',
    category: 'Trading',
    docPath: '/ui/trade-inputs/binarypanel',
    height: 380,
  },
  {
    name: 'ShapeCutter',
    description: 'Shape-based belief input with 8 strategy geometries',
    category: 'Trading',
    docPath: '/ui/trade-inputs/shapecutter',
    height: 480,
  },
  {
    name: 'CustomShapeEditor',
    description: 'Freeform belief editing with draggable control points',
    category: 'Trading',
    docPath: '/ui/trade-inputs/customshapeeditor',
    height: 420,
  },
  {
    name: 'BucketRangeSelector',
    description: 'Click-to-select bucket ranges with trade execution',
    category: 'Trading',
    docPath: '/ui/trade-inputs/bucketrangeselector',
    height: 380,
  },
  {
    name: 'BucketTradePanel',
    description: 'Composed distribution chart + bucket range selector',
    category: 'Trading',
    docPath: '/ui/trade-inputs/buckettradepanel',
    height: 420,
  },
  {
    name: 'PositionTable',
    description: 'Tabbed data table for open orders, trade history, and market positions',
    category: 'Positions',
    docPath: '/ui/positions/positiontable',
    height: 300,
  },
  {
    name: 'TimeSales',
    description: 'Real-time trade activity feed with polling',
    category: 'Positions',
    docPath: '/ui/positions/timesales',
    height: 280,
  },
  {
    name: 'MarketStats',
    description: 'Compact market statistics bar',
    category: 'Market Data',
    docPath: '/ui/markets/marketstats',
    height: 100,
  },
  {
    name: 'MarketCharts',
    description: 'Tabbed chart wrapper combining Consensus, Distribution, and Timeline',
    category: 'Charts',
    docPath: '/ui/charts/marketcharts',
    height: 320,
  },
];

function WidgetCard({ widget }: { widget: typeof WIDGET_CARDS[0] }) {
  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ifm-background-surface-color)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <code style={{ fontSize: '14px', fontWeight: 600 }}>{widget.name}</code>
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--ifm-color-emphasis-200)',
            color: 'var(--ifm-color-emphasis-700)',
          }}>{widget.category}</span>
        </div>
        <Link to={widget.docPath} style={{ fontSize: '12px' }}>
          Docs &rarr;
        </Link>
      </div>
      <div style={{
        height: `${widget.height}px`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <BrowserOnly fallback={<div style={{ padding: '20px', color: '#999' }}>Loading...</div>}>
          {() => {
            try {
              const UI = require('@functionspace/ui');
              const Component = UI[widget.name];
              if (!Component) {
                return <div style={{ padding: '20px', color: '#999' }}>Component not found</div>;
              }
              return (
                <div style={{
                  transform: 'scale(0.75)',
                  transformOrigin: 'top left',
                  width: '133.33%',
                  height: '133.33%',
                }}>
                  <Component marketId={DEMO_MARKET_ID} />
                </div>
              );
            } catch (e) {
              return <div style={{ padding: '20px', color: '#c00' }}>Error: {String(e)}</div>;
            }
          }}
        </BrowserOnly>
      </div>
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--ifm-color-emphasis-200)',
        fontSize: '13px',
        color: 'var(--ifm-color-emphasis-600)',
      }}>
        {widget.description}
      </div>
    </div>
  );
}

export default function Catalogue() {
  const categories = [...new Set(WIDGET_CARDS.map(w => w.category))];

  return (
    <Layout title="Widget Catalogue" description="Browse all FunctionSpace trading widgets">
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1>Widget Catalogue</h1>
        <p style={{ fontSize: '16px', color: 'var(--ifm-color-emphasis-600)', marginBottom: '32px' }}>
          Browse all {WIDGET_CARDS.length} trading widgets. Each card shows a live preview scaled to fit.
          Click "Docs" for full documentation, props, and usage examples.
        </p>

        {categories.map(category => (
          <div key={category} style={{ marginBottom: '40px' }}>
            <h2 style={{ marginBottom: '16px' }}>{category}</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '20px',
            }}>
              {WIDGET_CARDS.filter(w => w.category === category).map(widget => (
                <WidgetCard key={widget.name} widget={widget} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
