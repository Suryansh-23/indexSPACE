import { describe, it, expect } from 'vitest';
import { FS_DARK, FS_LIGHT, NATIVE_DARK, NATIVE_LIGHT, THEME_PRESETS, resolveChartColors, getPresetChartColors, DEFAULT_CATEGORY_COLORS, FALLBACK_CATEGORY_COLOR } from '../packages/react/src/themes.js';
import { resolveTheme } from '../packages/react/src/FunctionSpaceProvider.js';
import type { FSTheme } from '../packages/react/src/themes.js';

const ALL_PRESETS = { FS_DARK, FS_LIGHT, NATIVE_DARK, NATIVE_LIGHT };

const REQUIRED_TOKENS: (keyof Required<FSTheme>)[] = [
  'primary', 'accent', 'positive', 'negative', 'background',
  'surface', 'text', 'textSecondary', 'border',
  'bgSecondary', 'surfaceHover', 'borderSubtle', 'textMuted',
  'navFrom', 'navTo', 'overlay', 'inputBg', 'codeBg', 'chartBg',
  'accentGlow', 'badgeBg', 'badgeBorder', 'badgeText', 'logoFilter',
  'fontFamily', 'radiusSm', 'radiusMd', 'radiusLg',
  'borderWidth', 'transitionSpeed',
];

describe('Theme Presets', () => {
  it.each(Object.entries(ALL_PRESETS))('%s defines all 30 tokens as non-empty strings', (name, preset) => {
    for (const token of REQUIRED_TOKENS) {
      expect(preset[token], `${name} missing ${token}`).toBeDefined();
      expect(typeof preset[token], `${name}.${token} not string`).toBe('string');
      expect(preset[token].length, `${name}.${token} is empty`).toBeGreaterThan(0);
    }
  });

  it.each(Object.entries(ALL_PRESETS))('%s has exactly 30 tokens', (name, preset) => {
    expect(Object.keys(preset).length).toBe(30);
  });

  it('THEME_PRESETS metadata has 4 entries with correct IDs', () => {
    expect(THEME_PRESETS).toHaveLength(4);
    const ids = THEME_PRESETS.map(t => t.id);
    expect(ids).toContain('fs-dark');
    expect(ids).toContain('fs-light');
    expect(ids).toContain('native-dark');
    expect(ids).toContain('native-light');
  });

  it('each THEME_PRESETS entry has id, label, group', () => {
    for (const entry of THEME_PRESETS) {
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.group).toBe('string');
    }
  });
});

describe('resolveTheme', () => {
  it('no input returns FS_DARK', () => {
    const result = resolveTheme();
    expect(result).toEqual(FS_DARK);
  });

  it('string "fs-dark" returns FS_DARK', () => {
    expect(resolveTheme('fs-dark')).toEqual(FS_DARK);
  });

  it('string "fs-light" returns FS_LIGHT', () => {
    expect(resolveTheme('fs-light')).toEqual(FS_LIGHT);
  });

  it('string "native-dark" returns NATIVE_DARK', () => {
    expect(resolveTheme('native-dark')).toEqual(NATIVE_DARK);
  });

  it('string "native-light" returns NATIVE_LIGHT', () => {
    expect(resolveTheme('native-light')).toEqual(NATIVE_LIGHT);
  });

  it('unknown string falls back to FS_DARK', () => {
    expect(resolveTheme('unknown-theme' as any)).toEqual(FS_DARK);
  });

  it('custom object with only 9 core tokens gets all 21 defaults', () => {
    const custom: FSTheme = {
      primary: '#ff0000', accent: '#00ff00', positive: '#00ff00',
      negative: '#ff0000', background: '#111111', surface: '#222222',
      text: '#ffffff', textSecondary: '#aaaaaa', border: '#333333',
    };
    const result = resolveTheme(custom);

    // All 30 tokens present
    for (const token of REQUIRED_TOKENS) {
      expect(result[token], `missing ${token}`).toBeDefined();
    }

    // Defaults derived from core 9
    expect(result.bgSecondary).toBe('#111111');     // = background
    expect(result.surfaceHover).toBe('#222222');     // = surface
    expect(result.borderSubtle).toBe('#333333');     // = border
    expect(result.textMuted).toBe('#aaaaaa');        // = textSecondary
    expect(result.navFrom).toBe('#111111');           // = background
    expect(result.inputBg).toBe('#111111');           // = background
    expect(result.fontFamily).toBe('inherit');
    expect(result.radiusSm).toBe('0.375rem');
    expect(result.borderWidth).toBe('1px');
    expect(result.transitionSpeed).toBe('200ms');
  });

  it('object with preset base merges overrides', () => {
    const result = resolveTheme({ preset: 'fs-dark', primary: '#ff0000' });
    expect(result.primary).toBe('#ff0000');         // overridden
    expect(result.accent).toBe(FS_DARK.accent);     // from preset base
    expect(result.background).toBe(FS_DARK.background);
  });

  it('object with preset and optional token override', () => {
    const result = resolveTheme({ preset: 'native-dark', radiusSm: '0' });
    expect(result.radiusSm).toBe('0');
    expect(result.radiusMd).toBe(NATIVE_DARK.radiusMd);
  });
});

describe('resolveChartColors', () => {
  it('returns all required chart color fields', () => {
    const colors = resolveChartColors(FS_DARK);
    expect(colors.grid).toBeDefined();
    expect(colors.axisText).toBeDefined();
    expect(colors.tooltipBg).toBeDefined();
    expect(colors.tooltipBorder).toBeDefined();
    expect(colors.tooltipText).toBeDefined();
    expect(colors.crosshair).toBeDefined();
    expect(colors.consensus).toBeDefined();
    expect(colors.previewLine).toBeDefined();
    expect(colors.payout).toBeDefined();
    expect(colors.positions).toBeDefined();
    expect(colors.positions.length).toBeGreaterThan(0);
    expect(colors.fanBands).toBeDefined();
    expect(colors.fanBands.mean).toBeDefined();
    expect(colors.fanBands.band25).toBeDefined();
    expect(colors.fanBands.band50).toBeDefined();
    expect(colors.fanBands.band75).toBeDefined();
    expect(colors.fanBands.band95).toBeDefined();
  });

  it('preset overrides take precedence over smart defaults', () => {
    const presetOverrides = { consensus: '#ff0000', grid: '#00ff00' };
    const colors = resolveChartColors(FS_DARK, presetOverrides);
    expect(colors.consensus).toBe('#ff0000');
    expect(colors.grid).toBe('#00ff00');
    // Others still derived from theme
    expect(colors.tooltipText).toBe(FS_DARK.text);
  });

  it('custom overrides take precedence over preset overrides', () => {
    const presetOverrides = { consensus: '#ff0000' };
    const customOverrides = { consensus: '#0000ff' };
    const colors = resolveChartColors(FS_DARK, presetOverrides, customOverrides);
    expect(colors.consensus).toBe('#0000ff');
  });

  it('custom theme with no overrides gets smart defaults from tokens', () => {
    const customTheme = {
      ...FS_DARK,
      primary: '#ff00ff',
      accent: '#ffff00',
      borderSubtle: '#aabbcc',
      textMuted: '#ddeeff',
    };
    const colors = resolveChartColors(customTheme);
    expect(colors.consensus).toBe('#ff00ff');     // from primary
    expect(colors.previewLine).toBe('#ffff00');   // from accent
    expect(colors.grid).toBe('#aabbcc');           // from borderSubtle
    expect(colors.axisText).toBe('#ddeeff');       // from textMuted
  });

  it('native-dark preset has gray consensus (de-branded)', () => {
    const overrides = getPresetChartColors('native-dark');
    const colors = resolveChartColors(NATIVE_DARK, overrides);
    expect(colors.consensus).toBe('#6B7280');      // gray, not blue
    expect(colors.previewLine).toBe('#9CA3AF');    // light gray
  });

  it('fs-dark preset derives consensus from theme.primary', () => {
    const overrides = getPresetChartColors('fs-dark');
    const colors = resolveChartColors(FS_DARK, overrides);
    expect(colors.consensus).toBe(FS_DARK.primary);  // blue, from theme
  });

  it('payout defaults to theme.positive', () => {
    const colors = resolveChartColors(FS_DARK);
    expect(colors.payout).toBe(FS_DARK.positive);
  });

  it('positions array starts with positive/negative', () => {
    const colors = resolveChartColors(FS_DARK);
    expect(colors.positions[0]).toBe(FS_DARK.positive);
    expect(colors.positions[1]).toBe(FS_DARK.negative);
  });

  it('fan band colors are provided for presets', () => {
    const overrides = getPresetChartColors('native-dark');
    const colors = resolveChartColors(NATIVE_DARK, overrides);
    expect(colors.fanBands.mean).toBe('#6B7280');
    expect(colors.fanBands.band25).toContain('107,114,128');
  });

  it('fan band mean syncs with consensus when consensus is overridden', () => {
    const overrides = { consensus: '#ff0000' };
    const colors = resolveChartColors(FS_DARK, overrides);
    expect(colors.fanBands.mean).toBe('#ff0000');
  });
});

describe('Custom Theme Brightness Detection', () => {
  it('dark background custom theme gets dark category colors', () => {
    const darkCustomTheme = {
      ...FS_DARK,
      background: '#1a1a2e',
    };
    // No presetId -- forces brightness detection from background
    const colors = resolveChartColors(darkCustomTheme);
    for (const [cat, color] of Object.entries(DEFAULT_CATEGORY_COLORS.dark)) {
      expect(colors.categoryColors[cat], `${cat} should match dark variant`).toBe(color);
    }
  });

  it('light background custom theme gets light category colors', () => {
    const lightCustomTheme = {
      ...FS_LIGHT,
      background: '#ffffff',
    };
    // No presetId -- forces brightness detection from background
    const colors = resolveChartColors(lightCustomTheme);
    for (const [cat, color] of Object.entries(DEFAULT_CATEGORY_COLORS.light)) {
      expect(colors.categoryColors[cat], `${cat} should match light variant`).toBe(color);
    }
  });
});

describe('Category Colors', () => {
  const EXPECTED_CATEGORIES = ['General', 'Sports', 'Crypto', 'Finance', 'Tech', 'Culture', 'Politics', 'Macro'];

  it('resolveChartColors output includes categoryColors field', () => {
    const colors = resolveChartColors(FS_DARK);
    expect(colors.categoryColors).toBeDefined();
    expect(typeof colors.categoryColors).toBe('object');
    expect(Object.keys(colors.categoryColors).length).toBeGreaterThan(0);
  });

  it('dark theme presets resolve dark category color variants', () => {
    const fsDarkColors = resolveChartColors(FS_DARK, undefined, undefined, 'fs-dark');
    const nativeDarkColors = resolveChartColors(NATIVE_DARK, undefined, undefined, 'native-dark');

    for (const cat of EXPECTED_CATEGORIES) {
      expect(fsDarkColors.categoryColors[cat]).toBe(DEFAULT_CATEGORY_COLORS.dark[cat]);
      expect(nativeDarkColors.categoryColors[cat]).toBe(DEFAULT_CATEGORY_COLORS.dark[cat]);
    }
  });

  it('light theme presets resolve light category color variants', () => {
    const fsLightColors = resolveChartColors(FS_LIGHT, undefined, undefined, 'fs-light');
    const nativeLightColors = resolveChartColors(NATIVE_LIGHT, undefined, undefined, 'native-light');

    for (const cat of EXPECTED_CATEGORIES) {
      expect(fsLightColors.categoryColors[cat]).toBe(DEFAULT_CATEGORY_COLORS.light[cat]);
      expect(nativeLightColors.categoryColors[cat]).toBe(DEFAULT_CATEGORY_COLORS.light[cat]);
    }
  });

  it('categoryColors includes all 8 default categories', () => {
    const colors = resolveChartColors(FS_DARK);
    for (const cat of EXPECTED_CATEGORIES) {
      expect(colors.categoryColors[cat], `missing category: ${cat}`).toBeDefined();
    }
  });

  it('fallback color constants are defined with dark and light variants', () => {
    expect(FALLBACK_CATEGORY_COLOR.dark).toBeDefined();
    expect(FALLBACK_CATEGORY_COLOR.light).toBeDefined();
    expect(typeof FALLBACK_CATEGORY_COLOR.dark).toBe('string');
    expect(typeof FALLBACK_CATEGORY_COLOR.light).toBe('string');
  });

  it('category colors are concrete hex strings (not CSS variables)', () => {
    const colors = resolveChartColors(FS_DARK);
    for (const [cat, color] of Object.entries(colors.categoryColors)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(color).not.toMatch(/^var\(/);
    }
  });
});
