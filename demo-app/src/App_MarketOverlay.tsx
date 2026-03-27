import React from 'react';
import { FunctionSpaceProvider } from '@functionspace/react';
import { MarketOverlay } from '@functionspace/ui';
import { config, widgetTheme } from './App';

// -- Swap trading layout by changing this import --
import { BasicTradingLayout as TradingLayout } from './App_BasicTradingLayout';
// import { ShapeCutterTradingLayout as TradingLayout } from './App_ShapeCutterTradingLayout';
// import { DistRangeLayout as TradingLayout } from './App_DistRange';
// import { BinaryPanelLayout as TradingLayout } from './App_BinaryPanel';
// import { CustomShapeLayout as TradingLayout } from './App_CustomShapeLayout';
// import { TimelineBinaryLayout as TradingLayout } from './App_TimelineBinaryTradingLayout';

export default function App_MarketOverlay() {
  return (
    <FunctionSpaceProvider config={config} theme={widgetTheme}>
      <MarketOverlay
        state="open"
        categories={['crypto', 'politics', 'sports']}
        featuredCategories={['crypto', 'politics', 'sports']}
        pollInterval={5000}
      >
        {(marketId) => <TradingLayout marketId={marketId} />}
      </MarketOverlay>
    </FunctionSpaceProvider>
  );
}
