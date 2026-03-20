---
title: "Quickstart Guide - Starter Kits"
sidebar_position: 7
description: "Minimal integration quickstart with standalone config and layout examples."
---

# Quickstart Guide - Starter Kits

#### Quick Start: Minimal Integration

The fastest way to get trading widgets running. The demo app separates config from layout, `App.tsx` exports shared configuration, and layout files (e.g., `App_BasicTradingLayout.tsx`) define the component composition. You can also combine both into a single file as shown below.

> **Environment variables:** The demo app reads `VITE_FS_BASE_URL`, `VITE_FS_USERNAME`, `VITE_FS_PASSWORD`, `VITE_FS_MARKET_ID`, and `VITE_FS_AUTO_AUTH` from a `.env` file. Replace the hardcoded values below with your own or use environment variables.

**Standalone example**  -- Config + layout in one file. Drop this into any React app to get started.

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';
import type { FSThemeInput } from '@functionspace/react';
import { ConsensusChart, TradePanel, PositionTable, MarketStats, AuthWidget } from '@functionspace/ui';

const config = {
  baseUrl: 'https://your-api-url.com',
  username: 'your-username',          // optional  -- omit for manual auth via AuthWidget
  password: 'your-password',          // optional  -- omit for manual auth via AuthWidget
  autoAuthenticate: true,             // auto-login on mount when username/password provided
};

const MARKET_ID = 'your-market-id';
const theme: FSThemeInput = 'fs-dark';  // or 'fs-light', 'native-dark', 'native-light', or custom overrides

export default function App() {
  return (
    <FunctionSpaceProvider config={config} theme={theme}>
      
        <MarketStats marketId={MARKET_ID} />
        <AuthWidget />
      

      
        
          <ConsensusChart marketId={MARKET_ID} height={500} zoomable />
        
        
          <TradePanel marketId={MARKET_ID} modes={['gaussian', 'range']} />
        
      

      <PositionTable marketId={MARKET_ID} />
    </FunctionSpaceProvider>
  );
}
```

**`main.tsx`**  -- Standard React entry point. No SDK-specific code.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

That's it. The `FunctionSpaceProvider` handles authentication, theming, and cross-component state. All widgets inside it work automatically.

To use a different layout, replace the component block inside `FunctionSpaceProvider` with any of the starter kit compositions below.
