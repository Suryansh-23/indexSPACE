import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Helper to recursively get all files matching a pattern
function getFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('SDK Architecture', () => {

  describe('Layer Boundaries', () => {
    it('core package does not import from react or ui', () => {
      const coreDir = path.join(__dirname, '../packages/core/src');
      const coreFiles = getFiles(coreDir, /\.ts$/);
      const violations: string[] = [];

      for (const file of coreFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('@functionspace/react') ||
            content.includes('@functionspace/ui')) {
          violations.push(path.relative(process.cwd(), file));
        }
      }

      expect(violations).toEqual([]);
    });

    it('UI components do not directly import transaction/preview functions from core', () => {
      const uiDir = path.join(__dirname, '../packages/ui/src');
      const uiFiles = getFiles(uiDir, /\.tsx?$/);
      const violations: string[] = [];
      const forbiddenImports = ['buy', 'sell', 'previewPayoutCurve', 'previewSell'];

      for (const file of uiFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const fn of forbiddenImports) {
          // Match: import { buy } or import { buy, ... } from '@functionspace/core'
          // But NOT: import type { BuyResult } (type imports are fine)
          const importRegex = new RegExp(`import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from\\s*'@functionspace/core'`);
          if (importRegex.test(content)) {
            // Check it's not a type-only import
            const typeOnlyRegex = new RegExp(`import\\s+type\\s*\\{[^}]*\\b${fn}\\b`);
            if (!typeOnlyRegex.test(content)) {
              violations.push(`${path.relative(process.cwd(), file)}: imports ${fn} directly from core`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('react package does not import from ui', () => {
      const reactDir = path.join(__dirname, '../packages/react/src');
      const reactFiles = getFiles(reactDir, /\.tsx?$/);
      const violations: string[] = [];

      for (const file of reactFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('@functionspace/ui')) {
          violations.push(path.relative(process.cwd(), file));
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Hook Patterns', () => {
    it('all data-fetching hooks check for context', () => {
      const reactDir = path.join(__dirname, '../packages/react/src');
      // useChartZoom has no context dependency -- it's a pure state/action hook
      // useCacheSubscription receives cache as a parameter, not via FunctionSpaceContext
      const noContextHooks = ['useChartZoom', 'useCacheSubscription'];
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(f =>
        fs.statSync(f).isFile() && f.includes('use') &&
        !noContextHooks.some(h => path.basename(f).startsWith(h))
      );

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const filename = path.basename(file);

        // All hooks should check for context
        expect(content).toMatch(/if \(!ctx\) throw new Error/);
      }
    });

    it('data-fetching hooks return loading and error states', () => {
      const reactDir = path.join(__dirname, '../packages/react/src');
      // State/action hooks don't follow the data-fetching pattern
      const nonDataHooks = ['useAuth', 'useCustomShape', 'useChartZoom', 'useBuy', 'useSell', 'usePreviewPayout', 'usePreviewSell'];
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(
        f => !nonDataHooks.some(h => path.basename(f).startsWith(h))
      );

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Should have loading state
        expect(content).toMatch(/loading/);
        // Should have error state
        expect(content).toMatch(/error/);
      }
    });

    it('data-fetching hooks use cache subscription pattern', () => {
      const reactDir = path.join(__dirname, '../packages/react/src');
      // State/action hooks and internal helpers don't follow the data-fetching pattern
      const nonDataHooks = ['useAuth', 'useCustomShape', 'useChartZoom', 'useCacheSubscription'];
      // Derived hooks compose other hooks, they don't subscribe to cache directly
      const derivedHooks = ['useBucketDistribution', 'useDistributionState'];
      // Mutation/preview hooks use useState, not useCacheSubscription
      const mutationHooks = ['useBuy', 'useSell', 'usePreviewPayout', 'usePreviewSell'];
      const excludeHooks = [...nonDataHooks, ...derivedHooks, ...mutationHooks];
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(
        f => !excludeHooks.some(h => path.basename(f).startsWith(h))
      );

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const filename = path.basename(file);

        // Data-fetching hooks must use useCacheSubscription
        expect(content, `${filename} should use useCacheSubscription`).toMatch(/useCacheSubscription/);
      }
    });
  });

  describe('Context Shape', () => {
    it('context stores coordination state for component sync', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'),
        'utf-8'
      );

      // Should have selectedPosition for automatic chart/table coordination
      expect(contextFile).toMatch(/selectedPosition.*Position/);
      expect(contextFile).toMatch(/setSelectedPosition/);
    });

    it('context stores preview state for trade visualization', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'),
        'utf-8'
      );

      // Preview belief should be number[] (primitive array)
      expect(contextFile).toMatch(/previewBelief:\s*number\[\]/);
      // invalidateAll should be a function for global cache invalidation
      expect(contextFile).toMatch(/invalidateAll:\s*\(\)\s*=>\s*void/);
    });

    it('context stores auth state for interactive authentication', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'),
        'utf-8'
      );

      // Auth state fields
      expect(contextFile).toMatch(/user:\s*UserProfile\s*\|\s*null/);
      expect(contextFile).toMatch(/isAuthenticated:\s*boolean/);
      expect(contextFile).toMatch(/authLoading:\s*boolean/);
      expect(contextFile).toMatch(/authError:\s*Error\s*\|\s*null/);

      // Auth action methods
      expect(contextFile).toMatch(/login:/);
      expect(contextFile).toMatch(/signup:/);
      expect(contextFile).toMatch(/logout:/);
      expect(contextFile).toMatch(/refreshUser:/);
    });

    it('context stores passwordless auth state', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'),
        'utf-8'
      );

      expect(contextFile).toMatch(/passwordlessLogin:/);
      expect(contextFile).toMatch(/showAdminLogin:\s*boolean/);
      expect(contextFile).toMatch(/pendingAdminUsername:\s*string\s*\|\s*null/);
      expect(contextFile).toMatch(/clearAdminLogin:/);
    });

    it('context does not store market data (use hooks instead)', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'),
        'utf-8'
      );

      // Market data should be fetched via hooks, not stored in context
      expect(contextFile).not.toMatch(/:\s*MarketState\s*[|;]/);
      expect(contextFile).not.toMatch(/markets:/);
    });
  });

  describe('Export Completeness', () => {
    it('all hooks are exported from react package index', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'),
        'utf-8'
      );

      // Check key hooks
      expect(indexContent).toContain('useMarket');
      expect(indexContent).toContain('useConsensus');
      expect(indexContent).toContain('usePositions');
      expect(indexContent).toContain('useTradeHistory');
      expect(indexContent).toContain('useBucketDistribution');
      expect(indexContent).toContain('useMarketHistory');
      expect(indexContent).toContain('useDistributionState');
      expect(indexContent).toContain('useAuth');
      expect(indexContent).toContain('useCustomShape');
      expect(indexContent).toContain('useChartZoom');
      expect(indexContent).toContain('useBuy');
      expect(indexContent).toContain('useSell');
      expect(indexContent).toContain('usePreviewPayout');
      expect(indexContent).toContain('usePreviewSell');

      // Return types
      expect(indexContent).toContain('UseBuyReturn');
      expect(indexContent).toContain('UseSellReturn');
      expect(indexContent).toContain('UsePreviewPayoutReturn');
      expect(indexContent).toContain('UsePreviewSellReturn');
    });

    it('chart zoom types and helper are exported from react package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('ChartZoomOptions');
      expect(indexContent).toContain('ChartZoomResult');
      expect(indexContent).toContain('rechartsPlotArea');
    });

    it('react index exports new theme presets and types', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'), 'utf-8'
      );
      expect(indexContent).toContain('FS_DARK');
      expect(indexContent).toContain('FS_LIGHT');
      expect(indexContent).toContain('NATIVE_DARK');
      expect(indexContent).toContain('NATIVE_LIGHT');
      expect(indexContent).toContain('THEME_PRESETS');
      expect(indexContent).toContain('ThemePresetId');
      expect(indexContent).toContain('ResolvedFSTheme');
      expect(indexContent).toContain('resolveTheme');
    });

    it('react index exports ChartColors type and resolveChartColors', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'), 'utf-8'
      );
      expect(indexContent).toContain('ChartColors');
      expect(indexContent).toContain('resolveChartColors');
    });

    it('context interface includes chartColors', () => {
      const contextFile = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/context.ts'), 'utf-8'
      );
      expect(contextFile).toMatch(/chartColors.*ChartColors/);
    });

    it('react index does not export old DARK_THEME/LIGHT_THEME (clean break)', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'), 'utf-8'
      );
      expect(indexContent).not.toMatch(/\bDARK_THEME\b/);
      expect(indexContent).not.toMatch(/\bLIGHT_THEME\b/);
    });

    it('react index exports cache types', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('CacheConfig');
      expect(indexContent).toContain('QueryOptions');
    });

    it('all components are exported from ui package index', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      // Check key components
      expect(indexContent).toContain('ConsensusChart');
      expect(indexContent).toContain('DistributionChart');
      expect(indexContent).toContain('TimelineChart');
      expect(indexContent).toContain('MarketCharts');
      expect(indexContent).toContain('TradePanel');
      expect(indexContent).toContain('ShapeCutter');
      expect(indexContent).toContain('BinaryPanel');
      expect(indexContent).toContain('PositionTable');
      expect(indexContent).toContain('MarketStats');
      expect(indexContent).toContain('TimeSales');
      expect(indexContent).toContain('BucketRangeSelector');
      expect(indexContent).toContain('BucketTradePanel');
      expect(indexContent).toContain('CustomShapeEditor');
    });

    it('AuthWidget is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('AuthWidget');
      expect(indexContent).toContain('AuthWidgetProps');
    });

    it('PasswordlessAuthWidget is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('PasswordlessAuthWidget');
      expect(indexContent).toContain('PasswordlessAuthWidgetProps');
    });

    it('OverlayCurve type is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('OverlayCurve');
    });

    it('ChartView type is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('ChartView');
    });

    it('PositionTabId type is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('PositionTabId');
    });

    it('calculateBucketDistribution and BucketData are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('calculateBucketDistribution');
      expect(indexContent).toContain('BucketData');
    });

    it('auth types are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('UserProfile');
      expect(indexContent).toContain('AuthResult');
      expect(indexContent).toContain('SignupResult');
      expect(indexContent).toContain('SignupOptions');
    });

    it('auth functions are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('loginUser');
      expect(indexContent).toContain('signupUser');
      expect(indexContent).toContain('fetchCurrentUser');
      expect(indexContent).toContain('validateUsername');
    });

    it('passwordless auth functions and types are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('passwordlessLoginUser');
      expect(indexContent).toContain('silentReAuth');
      expect(indexContent).toContain('PASSWORD_REQUIRED');
      expect(indexContent).toContain('PasswordlessLoginResult');
    });

    it('timeline core functions are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('queryMarketHistory');
      expect(indexContent).toContain('computePercentiles');
      expect(indexContent).toContain('transformHistoryToFanChart');
      expect(indexContent).toContain('MarketSnapshot');
      expect(indexContent).toContain('MarketHistory');
      expect(indexContent).toContain('PercentileSet');
      expect(indexContent).toContain('FanChartPoint');
    });

    it('custom shape core functions are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('generateCustomShape');
      expect(indexContent).toContain('generateBellShape');
      expect(indexContent).toContain('SplineRegion');
    });

    it('chart zoom functions and types are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('pixelToDataX');
      expect(indexContent).toContain('computeZoomedDomain');
      expect(indexContent).toContain('computePannedDomain');
      expect(indexContent).toContain('filterVisibleData');
      expect(indexContent).toContain('generateEvenTicks');
      expect(indexContent).toContain('ZoomParams');
      expect(indexContent).toContain('PanParams');
    });

    it('exports validateBeliefVector from core', () => {
      const coreIndex = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );
      expect(coreIndex).toContain('validateBeliefVector');
    });
  });

  describe('Component Props Patterns', () => {
    it('ConsensusChart accepts overlayCurves prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/ConsensusChart.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('overlayCurves');
    });

    it('MarketCharts accepts views prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/MarketCharts.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('views');
      expect(chartFile).toContain('ChartView');
    });

    it('DistributionChart accepts defaultBucketCount prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/DistributionChart.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('defaultBucketCount');
    });

    it('MarketCharts accepts overlayCurves and defaultBucketCount props', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/MarketCharts.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('overlayCurves');
      expect(chartFile).toContain('defaultBucketCount');
    });

    it('TimelineChart accepts marketId prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/TimelineChart.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('marketId');
    });

    it('PositionTable accepts selection callback props and tabs prop', () => {
      const tableFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/market/PositionTable.tsx'),
        'utf-8'
      );

      expect(tableFile).toContain('selectedPositionId');
      expect(tableFile).toContain('onSelectPosition');
      expect(tableFile).toContain('tabs');
      expect(tableFile).toContain('PositionTabId');
    });

    it('DistributionChart accepts distributionState prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/DistributionChart.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('distributionState');
    });

    it('MarketCharts accepts distributionState prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/MarketCharts.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('distributionState');
    });

    it('BucketRangeSelector accepts marketId and distributionState props', () => {
      const file = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/trading/BucketRangeSelector.tsx'),
        'utf-8'
      );

      expect(file).toContain('marketId');
      expect(file).toContain('distributionState');
    });

    it('generateRange and RangeInput are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('generateRange');
      expect(indexContent).toContain('RangeInput');
    });

    it('zoomable charts accept zoomable prop', () => {
      const consensus = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/ConsensusChart.tsx'), 'utf-8'
      );
      const timeline = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/TimelineChart.tsx'), 'utf-8'
      );
      const marketCharts = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/MarketCharts.tsx'), 'utf-8'
      );
      const customShape = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/trading/CustomShapeEditor.tsx'), 'utf-8'
      );

      expect(consensus).toContain('zoomable');
      expect(timeline).toContain('zoomable');
      expect(marketCharts).toContain('zoomable');
      expect(customShape).toContain('zoomable');
    });

    it('DistributionState type is exported from react package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/react/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('DistributionState');
      expect(indexContent).toContain('DistributionStateConfig');
    });
  });
});
