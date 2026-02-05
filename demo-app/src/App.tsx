import { FunctionSpaceProvider } from '@functionspace/react';
import type { FSThemeInput } from '@functionspace/react';
import { ConsensusChart, TradePanel, MarketStats, PositionTable } from '@functionspace/ui';
import { ArticlePage } from './pages/ArticlePage';

const config = {
  baseUrl: import.meta.env.VITE_FS_BASE_URL,
  username: import.meta.env.VITE_FS_USERNAME,
  password: import.meta.env.VITE_FS_PASSWORD,
};

const MARKET_ID = import.meta.env.VITE_FS_MARKET_ID;

// ── Theme Options ──
// Simple preset: "light" or "dark"
const widgetTheme: FSThemeInput = "dark";

// Full custom theme - complete control over every color
// const widgetTheme: FSThemeInput = {
//   preset: 'dark',              // Start from dark or light base
//   primary: '#ff00ff',          // Magenta - main accent color
//   accent: '#00ffff',           // Cyan - secondary accent
//   positive: '#39ff14',         // Neon green - profit/success
//   negative: '#ff073a',         // Neon red - loss/error
//   background: '#1a0a2e',       // Deep purple - widget background
//   surface: '#2d1b4e',          // Lighter purple - cards/panels
//   text: '#ffffff',             // White - primary text
//   textSecondary: '#b794f6',    // Lavender - secondary text
//   border: '#6b21a8',           // Purple - borders
// };

// ── Layout Settings ──
const CHART_RATIO = 2.2;  // Chart takes 2 parts
const PANEL_RATIO = 1;  // Panel takes 1 part (2:1 = ~66%/33%)

export default function App() {
  return (
    <ArticlePage>
      <FunctionSpaceProvider config={config} theme={widgetTheme}>
        <MarketStats marketId={MARKET_ID} />

        <div style={{ display: 'flex', gap: '1rem',marginTop: '1rem', marginBottom: '1rem', minHeight: '520px', }}>
          <div style={{ flex: CHART_RATIO, minWidth: 0 }}>
            <ConsensusChart marketId={MARKET_ID} height={600} />
          </div>
          <div style={{ flex: PANEL_RATIO, minWidth: 0 }}>
            <TradePanel marketId={MARKET_ID} modes={['gaussian', 'plateau']}/>
          </div>
        </div>

        <PositionTable marketId={MARKET_ID} username={config.username} />
      </FunctionSpaceProvider>
    </ArticlePage>
  );
}
