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
      const hookFiles = getFiles(reactDir, /^use.*\.ts$/);

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Should reference invalidationCount for cache busting
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
    });

    it('all components are exported from ui package index', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/index.ts'),
        'utf-8'
      );

      // Check key components
      expect(indexContent).toContain('ConsensusChart');
      expect(indexContent).toContain('TradePanel');
      expect(indexContent).toContain('ShapeCutter');
      expect(indexContent).toContain('BinaryPanel');
      expect(indexContent).toContain('PositionTable');
      expect(indexContent).toContain('MarketStats');
      expect(indexContent).toContain('TimeSales');
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

    it('calculateBucketDistribution and BucketData are exported from core', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../packages/core/src/index.ts'),
        'utf-8'
      );

      expect(indexContent).toContain('calculateBucketDistribution');
      expect(indexContent).toContain('BucketData');
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

    it('ConsensusChart accepts views prop', () => {
      const chartFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/charts/ConsensusChart.tsx'),
        'utf-8'
      );

      expect(chartFile).toContain('views');
      expect(chartFile).toContain('ChartView');
    });

    it('PositionTable accepts selection callback props', () => {
      const tableFile = fs.readFileSync(
        path.join(__dirname, '../packages/ui/src/market/PositionTable.tsx'),
        'utf-8'
      );

      expect(tableFile).toContain('selectedPositionId');
      expect(tableFile).toContain('onSelectPosition');
    });
  });
});
