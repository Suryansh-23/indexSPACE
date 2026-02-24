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
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(f =>
        fs.statSync(f).isFile() && f.includes('use')
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
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/);

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Should have loading state
        expect(content).toMatch(/loading/);
        // Should have error state
        expect(content).toMatch(/error/);
      }
    });

    it('data-fetching hooks react to invalidationCount', () => {
      const reactDir = path.join(__dirname, '../packages/react/src');
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(
        f => !path.basename(f).startsWith('useAuth')
      );

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Should reference invalidationCount for cache busting
        // (useAuth is excluded — it's a state/action hook, not data-fetching)
        expect(content).toMatch(/ctx\.invalidationCount/);
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
      // Invalidation count should be number
      expect(contextFile).toMatch(/invalidationCount:\s*number/);
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
    });

    it('AuthWidget is exported from ui package', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('AuthWidget');
      expect(indexContent).toContain('AuthWidgetProps');
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

    it('buildRange and RangeInput are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('buildRange');
      expect(indexContent).toContain('RangeInput');
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
