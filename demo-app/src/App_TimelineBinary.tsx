import { FunctionSpaceProvider } from '@functionspace/react';
import { TimelineChart, BinaryPanel, AuthWidget } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';
import { config, MARKET_ID, widgetTheme } from './App';

const CHART_RATIO = 4;
const PANEL_RATIO = 1;

// TimelineChart (fan chart) beside BinaryPanel (dynamic-mean)
export default function App_TimelineBinary() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <AuthWidget />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', minHeight: '520px' }}>
          <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
            <TimelineChart marketId={MARKET_ID} height={500} />
          </div>
          <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
            <BinaryPanel
              marketId={MARKET_ID}
              xPoint={{ mode: 'dynamic-mean' }}
            />
          </div>
        </div>
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
