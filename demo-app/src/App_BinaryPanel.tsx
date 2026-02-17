import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketCharts, BinaryPanel, MarketStats, PositionTable } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

// All 4 xPoint modes displayed together for visual/functional testing.
// In practice, a consumer would mount only one BinaryPanel at a time.
export default function App_BinaryPanel() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketStats marketId={MARKET_ID} />

        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <MarketCharts
            marketId={MARKET_ID}
            height={400}
            views={['consensus', 'distribution']}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {/* Mode 1: Static — locked threshold */}
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Static (locked at 91)
            </p>
            <BinaryPanel
              marketId={MARKET_ID}
              xPoint={{ mode: 'static', value: 91 }}
            />
          </div>

          {/* Mode 2: Variable — user-editable, defaults to midpoint */}
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Variable (user-editable)
            </p>
            <BinaryPanel
              marketId={MARKET_ID}
              xPoint={{ mode: 'variable' }}
            />
          </div>

          {/* Mode 3: Dynamic Mode — consensus peak, overridable */}
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dynamic Mode (consensus peak)
            </p>
            <BinaryPanel
              marketId={MARKET_ID}
              xPoint={{ mode: 'dynamic-mode', allowOverride: true }}
            />
          </div>

          {/* Mode 4: Dynamic Mean — consensus mean, overridable */}
          <div>
            <p style={{ color: 'var(--fs-text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dynamic Mean (expected value)
            </p>
            <BinaryPanel
              marketId={MARKET_ID}
              xPoint={{ mode: 'dynamic-mean', allowOverride: true }}
            />
          </div>
        </div>

        <PositionTable marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
