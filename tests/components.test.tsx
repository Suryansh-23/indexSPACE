import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';

expect.extend(matchers);

// Polyfill ResizeObserver for jsdom (Recharts requires it)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Mock @functionspace/core (used directly by components and hooks)
vi.mock('@functionspace/core', () => ({
  FSClient: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    setStoredUsername: vi.fn(),
    clearStoredUsername: vi.fn(),
    isAuthenticated: false,
    base: 'https://test.api.com',
  })),
  validateUsername: vi.fn().mockReturnValue({ valid: true }),
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  loginUser: vi.fn().mockResolvedValue({
    token: 'mock-token',
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
  }),
  signupUser: vi.fn().mockResolvedValue({
    user: { userId: 2, username: 'newuser', walletValue: 1000, role: 'trader' },
  }),
  fetchCurrentUser: vi.fn().mockResolvedValue({
    userId: 1, username: 'testuser', walletValue: 1000, role: 'trader',
  }),
  passwordlessLoginUser: vi.fn().mockResolvedValue({
    action: 'login',
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
    token: 'mock-passwordless-token',
  }),
  silentReAuth: vi.fn().mockResolvedValue({
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
    token: 'mock-reauth-token',
  }),
  queryMarketState: vi.fn(),
  getConsensusCurve: vi.fn(),
  queryMarketPositions: vi.fn(),
  queryTradeHistory: vi.fn(),
  queryMarketHistory: vi.fn(),
  mapPosition: vi.fn((p: any) => p),
  calculateBucketDistribution: vi.fn().mockReturnValue([
    { range: '0-10', min: 0, max: 10, percentage: 10 },
    { range: '10-20', min: 10, max: 20, percentage: 15 },
    { range: '20-30', min: 20, max: 30, percentage: 25 },
    { range: '30-40', min: 30, max: 40, percentage: 20 },
    { range: '40-50', min: 40, max: 50, percentage: 15 },
    { range: '50-60', min: 50, max: 60, percentage: 10 },
    { range: '60-70', min: 60, max: 70, percentage: 3 },
    { range: '70-80', min: 70, max: 80, percentage: 1 },
    { range: '80-90', min: 80, max: 90, percentage: 0.5 },
    { range: '90-100', min: 90, max: 100, percentage: 0.5 },
  ]),
  computePercentiles: vi.fn().mockReturnValue({
    p2_5: 5, p12_5: 15, p25: 25, p37_5: 35, p50: 50,
    p62_5: 60, p75: 70, p87_5: 80, p97_5: 95,
  }),
  generateCustomShape: vi.fn().mockReturnValue(
    Array(11).fill(null).map(() => 1 / 11),
  ),
  generateBellShape: vi.fn().mockImplementation((n: number) =>
    Array(n).fill(null).map((_, i) => {
      const mid = (n - 1) / 2;
      return Math.max(0.5, 5 * Math.exp(-((i - mid) ** 2) / (2 * (n / 4) ** 2)));
    }),
  ),
  computeStatistics: vi.fn().mockReturnValue({ mode: 50, mean: 50, median: 50, variance: 25, stdDev: 5 }),
  pixelToDataX: vi.fn(),
  computeZoomedDomain: vi.fn(),
  computePannedDomain: vi.fn(),
  filterVisibleData: vi.fn(),
  // Generators used by trading components
  generateGaussian: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  generateRange: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  generateBelief: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  generateDip: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  generateLeftSkew: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  generateRightSkew: vi.fn().mockReturnValue(Array(11).fill(null).map(() => 1 / 11)),
  evaluateDensityCurve: vi.fn().mockReturnValue(
    Array(100).fill(null).map((_, i) => ({ x: i, y: 0.01 })),
  ),
  evaluateDensityPiecewise: vi.fn().mockReturnValue(0.01),
  transformHistoryToFanChart: vi.fn().mockReturnValue([]),
  SHAPE_DEFINITIONS: [
    { id: 'gaussian', name: 'Gaussian', description: 'Bell curve', svgPath: 'M10,50 Q50,5 90,50', parameters: ['targetOutcome', 'confidence'] },
    { id: 'range', name: 'Range', description: 'Flat range', svgPath: 'M10,50 L30,10 L70,10 L90,50', parameters: ['rangeValues'] },
    { id: 'spike', name: 'Spike', description: 'Sharp spike', svgPath: 'M10,50 L50,5 L90,50', parameters: ['targetOutcome', 'confidence'] },
    { id: 'bimodal', name: 'Bimodal', description: 'Two peaks', svgPath: 'M10,50 Q30,10 50,50 Q70,10 90,50', parameters: ['rangeValues', 'confidence', 'peakBias'] },
    { id: 'dip', name: 'Dip', description: 'Inverted peak', svgPath: 'M10,10 Q50,50 90,10', parameters: ['targetOutcome', 'confidence'] },
    { id: 'leftskew', name: 'Left Skew', description: 'Skewed left', svgPath: 'M10,10 Q30,10 50,50 L90,50', parameters: ['targetOutcome', 'confidence', 'skewAmount'] },
    { id: 'rightskew', name: 'Right Skew', description: 'Skewed right', svgPath: 'M10,50 L50,50 Q70,10 90,10', parameters: ['targetOutcome', 'confidence', 'skewAmount'] },
    { id: 'uniform', name: 'Uniform', description: 'Flat', svgPath: 'M10,30 L90,30', parameters: [] },
  ],
  // API functions used by hooks
  buy: vi.fn().mockResolvedValue({ positionId: 1, collateral: 100 }),
  sell: vi.fn().mockResolvedValue({ collateralReturned: 95 }),
  previewPayoutCurve: vi.fn().mockResolvedValue({ maxPayout: 200, previews: [] }),
  previewSell: vi.fn().mockResolvedValue({ collateralReturned: 95 }),
  discoverMarkets: vi.fn(),
}));

import { FunctionSpaceProvider } from '../packages/react/src';
import { PasswordlessAuthWidget } from '../packages/ui/src/auth/PasswordlessAuthWidget';
import {
  MarketStats,
  MarketCard,
  MarketList,
  MarketOverlay,
  MarketFilterBar,
  TimeSales,
  ConsensusChart,
  DistributionChart,
  TimelineChart,
  MarketCharts,
  TradePanel,
  BinaryPanel,
  ShapeCutter,
  CustomShapeEditor,
  BucketRangeSelector,
  BucketTradePanel,
  PositionTable,
  AuthWidget,
} from '../packages/ui/src';
import { Overlay } from '../packages/ui/src/components/Overlay';
import {
  queryMarketState,
  getConsensusCurve,
  queryMarketPositions,
  queryTradeHistory,
  queryMarketHistory,
  buy,
  sell,
  loginUser,
  signupUser,
  previewPayoutCurve,
  discoverMarkets,
} from '@functionspace/core';

const mockConfig = {
  baseUrl: 'https://test.api.com',
};

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <React.StrictMode>
        <FunctionSpaceProvider config={mockConfig} theme="fs-dark">
          {children}
        </FunctionSpaceProvider>
      </React.StrictMode>
    );
  };
}

function setup(jsx: React.ReactElement) {
  return { user: userEvent.setup(), ...render(jsx, { wrapper: createWrapper() }) };
}

// ── Mock data for market-aware components ──

const mockMarketData = {
  id: '1',
  title: 'Test Market',
  config: { numBuckets: 10, lowerBound: 0, upperBound: 100, K: 10, L: 0, H: 100 },
  alpha_vector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  consensus: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  current_pool: 1000,
  total_volume: 5000,
  poolBalance: 1000,
  totalVolume: 5000,
  positionsOpen: 5,
  resolutionState: 'open',
  xAxisUnits: 'pts',
  decimals: 2,
};

const mockConsensusData = {
  points: Array(100).fill(null).map((_, i) => ({
    x: i,
    y: 0.01,
  })),
};

const mockPositions = [
  {
    positionId: 1,
    owner: 'testuser',
    status: 'open',
    collateral: 100,
    prediction: 50.0,
    belief: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    createdAt: '2025-01-01T00:00:00Z',
    soldPrice: null,
    settlementPayout: null,
  },
];

const mockTrades = [
  {
    id: 1,
    timestamp: '2025-01-01 12:00:00',
    prediction: 50.0,
    amount: 100,
    side: 'buy' as const,
    username: 'testuser',
  },
];

const mockHistory = {
  snapshots: [],
};

function setupMocksForData() {
  vi.mocked(queryMarketState).mockResolvedValue(mockMarketData as any);
  vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensusData as any);
  vi.mocked(queryMarketPositions).mockResolvedValue(mockPositions as any);
  vi.mocked(queryTradeHistory).mockResolvedValue(mockTrades as any);
  vi.mocked(queryMarketHistory).mockResolvedValue(mockHistory as any);
  vi.mocked(discoverMarkets).mockResolvedValue([mockMarketForCard] as any);
}

function setupMocksForLoading() {
  vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {}));
  vi.mocked(getConsensusCurve).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryMarketPositions).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryTradeHistory).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryMarketHistory).mockImplementation(() => new Promise(() => {}));
  vi.mocked(discoverMarkets).mockReturnValue(new Promise(() => {}) as any);
}

function setupMocksForError() {
  vi.mocked(queryMarketState).mockRejectedValue(new Error('API Error'));
  vi.mocked(getConsensusCurve).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryMarketPositions).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryTradeHistory).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryMarketHistory).mockRejectedValue(new Error('API Error'));
  vi.mocked(discoverMarkets).mockRejectedValue(new Error('API Error'));
}

describe('PasswordlessAuthWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<PasswordlessAuthWidget />);
    }).toThrow('must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('renders Sign In / Sign Up button when unauthenticated', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <PasswordlessAuthWidget />
      </Wrapper>,
    );

    // The idle view shows a "Sign In / Sign Up" button
    const button = await screen.findByRole('button', { name: /sign in \/ sign up/i });
    expect(button).toBeDefined();
  });

  it('shows loading indicator during submission', async () => {
    // Make passwordlessLoginUser hang to keep loading state active
    const { passwordlessLoginUser } = await import('@functionspace/core') as any;
    passwordlessLoginUser.mockReturnValue(new Promise(() => {})); // never resolves

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <PasswordlessAuthWidget />
      </Wrapper>,
    );

    // Open modal
    await act(async () => {
      const openBtn = screen.getByRole('button', { name: /sign in \/ sign up/i });
      fireEvent.click(openBtn);
    });

    // Type a username and submit
    const input = document.querySelector('.fs-auth-input') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'testuser' } });
    });

    const form = document.querySelector('.fs-auth-form') as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
    });

    // The submit button should show loading text
    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeDefined();
    });

    // Restore mock
    passwordlessLoginUser.mockResolvedValue({
      action: 'login',
      user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
      token: 'mock-passwordless-token',
    });
  });

  it('displays error message when form validation fails', async () => {
    // Use validateUsername mock to return an error
    const { validateUsername } = await import('@functionspace/core') as any;
    validateUsername.mockReturnValue({ valid: false, error: 'Username must be at least 3 characters' });

    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <PasswordlessAuthWidget />
      </Wrapper>,
    );

    // Click "Sign In / Sign Up" to open modal
    await act(async () => {
      const openBtn = screen.getByRole('button', { name: /sign in \/ sign up/i });
      fireEvent.click(openBtn);
    });

    // Find the form and submit it
    const form = document.querySelector('.fs-auth-form') as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      fireEvent.submit(form);
    });

    // The error message should appear
    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeDefined();
    });

    // Restore mock to default
    validateUsername.mockReturnValue({ valid: true });
  });

  it('opens modal when Sign In / Sign Up button is clicked', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <PasswordlessAuthWidget />
      </Wrapper>,
    );

    await act(async () => {
      const openBtn = screen.getByRole('button', { name: /sign in \/ sign up/i });
      fireEvent.click(openBtn);
    });

    // Modal should show the form title
    const formTitle = screen.getByText('Sign In / Sign Up', { selector: 'h4' });
    expect(formTitle).toBeDefined();
  });

  it('unmounts without errors', async () => {
    const Wrapper = createWrapper();
    const { unmount } = render(
      <Wrapper>
        <PasswordlessAuthWidget />
      </Wrapper>,
    );

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    const wrapper = createWrapper();
    const { container } = render(<PasswordlessAuthWidget />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in \/ sign up/i })).toBeDefined();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Group A: Read-only components ──

describe('MarketStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketStats marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<MarketStats marketId="1" />, { wrapper });
    expect(container.querySelector('.fs-skeleton')).toBeTruthy();
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<MarketStats marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-stats-bar')).toBeTruthy();
      expect(container.textContent).toContain('TOTAL VOLUME');
      expect(container.textContent).toContain('Active');
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<MarketStats marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toContain('Error');
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<MarketStats marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<MarketStats marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-stats-bar')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('TimeSales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TimeSales marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<TimeSales marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading trades...');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TimeSales marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-time-sales')).toBeTruthy();
      expect(container.textContent).toContain('Time & Sales');
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<TimeSales marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-retry-btn')).toBeTruthy();
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<TimeSales marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('calls refetch when Retry is clicked on error', async () => {
    setupMocksForError();
    const { user } = setup(<TimeSales marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined();
    });

    // Clear mocks and set up success for retry
    vi.mocked(queryTradeHistory).mockClear();
    setupMocksForData();

    await user.click(screen.getByText('Retry'));

    expect(vi.mocked(queryTradeHistory)).toHaveBeenCalled();
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TimeSales marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-time-sales')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ConsensusChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ConsensusChart marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<ConsensusChart marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<ConsensusChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<ConsensusChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<ConsensusChart marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<ConsensusChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('DistributionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<DistributionChart marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<DistributionChart marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<DistributionChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<DistributionChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<DistributionChart marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('updates bucket count when slider is changed', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    render(<DistributionChart marketId="1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Buckets:/)).toBeDefined();
    });

    // Fallback: bucket slider lacks aria-label (see accessibility-audit-findings.md)
    const slider = document.querySelector('.fs-chart-bucket-slider') as HTMLInputElement;
    expect(slider).toBeTruthy();

    await act(async () => {
      fireEvent.change(slider, { target: { value: '20' } });
    });

    await waitFor(() => {
      expect(screen.getByText('20')).toBeDefined();
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<DistributionChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
    const results = await axe(container, { rules: { label: { enabled: false } } });
    // KNOWN VIOLATION: label -- bucket slider <input type="range"> missing label
    expect(results).toHaveNoViolations();
  });
});

describe('TimelineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TimelineChart marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<TimelineChart marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TimelineChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<TimelineChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<TimelineChart marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('clicks time filter button via MarketCharts timeline tab', async () => {
    setupMocksForData();
    const { user } = setup(<MarketCharts marketId="1" views={['consensus', 'timeline']} />);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeDefined();
    });

    // Navigate to timeline tab
    await user.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByText('All')).toBeDefined();
    });

    // Click 24h filter
    await user.click(screen.getByText('24h'));

    // Components lack ARIA tab semantics (see accessibility-audit-findings.md)
    // Assert CSS active class as proxy until accessibility remediation adds aria-selected
    const btn24h = screen.getByText('24h');
    expect(btn24h.className).toContain('active');
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TimelineChart marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('MarketCharts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketCharts marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<MarketCharts marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<MarketCharts marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<MarketCharts marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<MarketCharts marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('switches chart view when tab is clicked', async () => {
    setupMocksForData();
    const { user } = setup(<MarketCharts marketId="1" views={['consensus', 'distribution', 'timeline']} />);

    await waitFor(() => {
      expect(screen.getByText('Distribution')).toBeDefined();
    });

    await user.click(screen.getByText('Distribution'));

    await waitFor(() => {
      expect(screen.getByText('Aggregate Distribution')).toBeDefined();
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<MarketCharts marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-chart-container')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Group B: Buy-side trading components ──

describe('TradePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TradePanel marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<TradePanel marketId="1" />, { wrapper });
    expect(container.querySelector('.fs-trade-panel')).toBeTruthy();
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-trade-panel')).toBeTruthy();
      expect(container.textContent).toContain('Submit Trade');
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<TradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-trade-panel')).toBeTruthy();
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<TradePanel marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('calls buy() when Submit Trade is clicked', async () => {
    setupMocksForData();
    const { user } = setup(<TradePanel marketId="1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /submit trade/i }));

    await waitFor(() => {
      expect(vi.mocked(buy)).toHaveBeenCalledWith(
        expect.anything(), // client
        '1', // marketId
        expect.any(Array), // belief vector
        expect.any(Number), // collateral
        expect.any(Number), // numBuckets
      );
    });
  });

  it('calls previewPayoutCurve after amount change with debounce', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupMocksForData();
    const wrapper = createWrapper();
    render(<TradePanel marketId="1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('Amount (USDC)')).toBeDefined();
    });

    const amountInput = screen.getByLabelText('Amount (USDC)');
    await act(async () => {
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '200');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(vi.mocked(previewPayoutCurve)).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires onBuy callback and resets form on successful trade', async () => {
    setupMocksForData();
    const onBuy = vi.fn();
    const { user } = setup(<TradePanel marketId="1" onBuy={onBuy} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /submit trade/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onBuy).toHaveBeenCalled();
    });

    // Form should reset -- amount back to 100
    const amountInput = screen.getByLabelText('Amount (USDC)') as HTMLInputElement;
    expect(amountInput.value).toBe('100');
  });

  it('shows error and fires onError on failed trade', async () => {
    setupMocksForData();
    vi.mocked(buy).mockRejectedValueOnce(new Error('Insufficient funds'));
    const onError = vi.fn();
    const { user } = setup(<TradePanel marketId="1" onError={onError} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit trade/i })).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /submit trade/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeDefined();
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<TradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-trade-panel')).toBeTruthy();
      expect(container.textContent).toContain('Submit Trade');
    });
    const results = await axe(container, { rules: { 'aria-input-field-name': { enabled: false } } });
    // KNOWN VIOLATION: aria-input-field-name -- rc-slider handles missing aria-label
    expect(results).toHaveNoViolations();
  });
});

describe('BinaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<BinaryPanel marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<BinaryPanel marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BinaryPanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-binary-panel')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<BinaryPanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<BinaryPanel marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('shows form section after clicking Yes', async () => {
    setupMocksForData();
    const { user } = setup(<BinaryPanel marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeDefined();
    });

    await user.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(screen.getByText('Submit Trade')).toBeDefined();
    });
  });

  it('toggles side when clicking No after Yes', async () => {
    setupMocksForData();
    const { user } = setup(<BinaryPanel marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeDefined();
    });

    await user.click(screen.getByText('Yes'));
    await waitFor(() => {
      expect(screen.getByText('Submit Trade')).toBeDefined();
    });

    await user.click(screen.getByText('No'));
    // Form should still be visible (side switched to No)
    await waitFor(() => {
      expect(screen.getByText('Submit Trade')).toBeDefined();
    });
  });

  it('calls buy() after selecting Yes and submitting', async () => {
    setupMocksForData();
    const { user } = setup(<BinaryPanel marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeDefined();
    });

    await user.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(screen.getByText('Submit Trade')).toBeDefined();
    });

    await user.click(screen.getByText('Submit Trade'));

    await waitFor(() => {
      expect(vi.mocked(buy)).toHaveBeenCalledWith(
        expect.anything(), // client
        '1', // marketId
        expect.any(Array), // belief vector
        expect.any(Number), // collateral
        expect.any(Number), // numBuckets
      );
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BinaryPanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-binary-panel')).toBeTruthy();
    });
    const results = await axe(container, { rules: { label: { enabled: false } } });
    // KNOWN VIOLATION: label -- number input missing label
    expect(results).toHaveNoViolations();
  });
});

describe('ShapeCutter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ShapeCutter marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<ShapeCutter marketId="1" />, { wrapper });
    expect(container.querySelector('.fs-shape-cutter')).toBeTruthy();
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<ShapeCutter marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-shape-cutter')).toBeTruthy();
      expect(container.textContent).toContain('Trade Summary');
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<ShapeCutter marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-shape-cutter')).toBeTruthy();
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<ShapeCutter marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('selects a shape when clicking a shape button', async () => {
    setupMocksForData();
    const { user } = setup(<ShapeCutter marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Range')).toBeDefined();
    });

    await user.click(screen.getByText('Range'));

    // Switching from gaussian (default) to range changes the visible slider label
    await waitFor(() => {
      expect(screen.getByText('Select Range')).toBeDefined();
    });
  });

  it('calls buy() when submit trade button is clicked', async () => {
    setupMocksForData();
    const { user } = setup(<ShapeCutter marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/submit trade/i)).toBeDefined();
    });

    await user.click(screen.getByText(/submit trade/i));

    await waitFor(() => {
      expect(vi.mocked(buy)).toHaveBeenCalledWith(
        expect.anything(), // client
        '1', // marketId
        expect.any(Array), // belief vector
        expect.any(Number), // collateral
        expect.any(Number), // numBuckets
      );
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<ShapeCutter marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-shape-cutter')).toBeTruthy();
      expect(container.textContent).toContain('Trade Summary');
    });
    const results = await axe(container, { rules: { 'aria-input-field-name': { enabled: false } } });
    // KNOWN VIOLATION: aria-input-field-name -- rc-slider handles missing aria-label
    expect(results).toHaveNoViolations();
  });
});

describe('CustomShapeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<CustomShapeEditor marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<CustomShapeEditor marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<CustomShapeEditor marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-custom-shape')).toBeTruthy();
      expect(container.textContent).toContain('Submit Trade');
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<CustomShapeEditor marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<CustomShapeEditor marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('submits trade when submit button is clicked', async () => {
    setupMocksForData();
    const onBuy = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(<CustomShapeEditor marketId="1" onBuy={onBuy} />, { wrapper });

    // Wait for market data to load and form to be valid (button enabled)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /submit trade/i });
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });

    // Fallback: userEvent.click does not trigger form submission in CustomShapeEditor
    // due to jsdom limitation with complex Recharts component trees (documented finding)
    const form = screen.getByRole('button', { name: /submit trade/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(buy)).toHaveBeenCalledWith(
        expect.anything(), // client
        '1', // marketId
        expect.any(Array), // belief vector
        expect.any(Number), // collateral
        expect.any(Number), // numBuckets
      );
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<CustomShapeEditor marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-custom-shape')).toBeTruthy();
    });
    const results = await axe(container, { rules: { label: { enabled: false } } });
    // KNOWN VIOLATION: label -- multiple range inputs missing labels (per-bucket sliders)
    expect(results).toHaveNoViolations();
  });
});

describe('BucketRangeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<BucketRangeSelector marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<BucketRangeSelector marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading market data...');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BucketRangeSelector marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-bucket-range')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<BucketRangeSelector marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toMatch(/Error/i);
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<BucketRangeSelector marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('selects a bucket when clicked', async () => {
    setupMocksForData();
    const { user } = setup(<BucketRangeSelector marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('0-10')).toBeDefined();
    });

    await user.click(screen.getByText('0-10').closest('button')!);

    // After selecting a bucket, the selection count text updates
    await waitFor(() => {
      expect(screen.getByText(/1\/.*selected/)).toBeDefined();
    });
  });

  it('calls buy() when submitting after selecting a bucket', async () => {
    setupMocksForData();
    const { user } = setup(<BucketRangeSelector marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('0-10')).toBeDefined();
    });

    await user.click(screen.getByText('0-10').closest('button')!);
    await user.click(screen.getByText('Submit Trade'));

    await waitFor(() => {
      expect(vi.mocked(buy)).toHaveBeenCalledWith(
        expect.anything(), // client
        '1', // marketId
        expect.any(Array), // belief vector
        expect.any(Number), // collateral
        expect.any(Number), // numBuckets
      );
    });
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BucketRangeSelector marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-bucket-range')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Group C: Sell-side + composed ──

describe('PositionTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<PositionTable marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<PositionTable marketId="1" />, { wrapper });
    expect(container.textContent).toContain('Loading positions...');
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<PositionTable marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-table-container')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<PositionTable marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-retry-btn')).toBeTruthy();
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<PositionTable marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('calls sell() when Sell button is clicked', async () => {
    setupMocksForData();
    const { user } = setup(<PositionTable marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Sell')).toBeDefined();
    });

    await user.click(screen.getByText('Sell'));

    await waitFor(() => {
      expect(vi.mocked(sell)).toHaveBeenCalledWith(
        expect.anything(), // client
        expect.any(Number), // positionId
        '1', // marketId
      );
    });
  });

  it('shows Selling... span while sell is in progress', async () => {
    setupMocksForData();
    vi.mocked(sell).mockImplementationOnce(() => new Promise(() => {})); // never resolves
    const { user } = setup(<PositionTable marketId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Sell')).toBeDefined();
    });

    await user.click(screen.getByText('Sell'));

    await waitFor(() => {
      expect(screen.getByText('Selling...')).toBeDefined();
    });
  });

  it('switches tabs when tab button is clicked', async () => {
    setupMocksForData();
    const { user } = setup(<PositionTable marketId="1" tabs={['open-orders', 'trade-history']} />);

    await waitFor(() => {
      expect(screen.getByText('Open Orders')).toBeDefined();
    });

    await user.click(screen.getByText('Trade History'));

    // Trade History tab shows empty state (mock positions are all 'open', none 'sold'/'settled')
    await waitFor(() => {
      expect(screen.getByText('No trade history')).toBeDefined();
    });
  });

  it('calls onSelectPosition when row is clicked', async () => {
    setupMocksForData();
    const onSelectPosition = vi.fn();
    const { user } = setup(<PositionTable marketId="1" onSelectPosition={onSelectPosition} />);

    await waitFor(() => {
      expect(screen.getByText('50.00')).toBeDefined();
    });

    // Click the row containing prediction 50.00
    await user.click(screen.getByText('50.00'));

    expect(onSelectPosition).toHaveBeenCalledWith(1);
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<PositionTable marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-table-container')).toBeTruthy();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('BucketTradePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<BucketTradePanel marketId="1" />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(<BucketTradePanel marketId="1" />, { wrapper });
    expect(container.querySelector('.fs-bucket-trade-panel')).toBeTruthy();
  });

  it('renders with data', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BucketTradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-bucket-trade-panel')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(<BucketTradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-bucket-trade-panel')).toBeTruthy();
    });
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(<BucketTradePanel marketId="1" />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(<BucketTradePanel marketId="1" />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-bucket-trade-panel')).toBeTruthy();
    });
    const results = await axe(container, { rules: { label: { enabled: false } } });
    // KNOWN VIOLATION: label -- bucket slider <input type="range"> missing label
    expect(results).toHaveNoViolations();
  });
});

describe('AuthWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<AuthWidget />);
    }).toThrow('must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state initially', async () => {
    const wrapper = createWrapper();
    const { container } = render(<AuthWidget />, { wrapper });
    expect(container.querySelector('.fs-auth-widget')).toBeTruthy();
  });

  it('renders with data', async () => {
    const wrapper = createWrapper();
    const { container } = render(<AuthWidget />, { wrapper });
    await waitFor(() => {
      expect(container.querySelector('.fs-auth-widget')).toBeTruthy();
      expect(container.textContent).toContain('Sign In');
      expect(container.textContent).toContain('Sign Up');
    });
  });

  it('handles unauthenticated state', async () => {
    const wrapper = createWrapper();
    const { container } = render(<AuthWidget />, { wrapper });
    await waitFor(() => {
      expect(container.textContent).toContain('Sign In');
      expect(container.textContent).toContain('Sign Up');
    });
  });

  it('unmounts without errors', async () => {
    const wrapper = createWrapper();
    const { unmount } = render(<AuthWidget />, { wrapper });
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('submits login form and calls loginUser', async () => {
    const { user } = setup(<AuthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });

    // Click Sign In to go to login form
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter username')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByText('Log In'));

    await waitFor(() => {
      expect(vi.mocked(loginUser)).toHaveBeenCalledWith(
        expect.anything(), // client
        'testuser', // username
        'password123', // password
      );
    });
  });

  it('submits signup form and calls signupUser', async () => {
    const { user } = setup(<AuthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sign Up')).toBeDefined();
    });

    await user.click(screen.getByText('Sign Up'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Choose a username')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText('Choose a username'), 'newuser');
    await user.type(screen.getByPlaceholderText('Min 6 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(vi.mocked(signupUser)).toHaveBeenCalledWith(
        expect.anything(), // client
        'newuser', // username
        'password123', // password
        undefined, // options (no access code provided)
      );
    });
  });

  it('shows password mismatch error in signup', async () => {
    const { user } = setup(<AuthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sign Up')).toBeDefined();
    });

    await user.click(screen.getByText('Sign Up'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Choose a username')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText('Choose a username'), 'newuser');
    await user.type(screen.getByPlaceholderText('Min 6 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'different456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeDefined();
    });

    // signupUser should NOT have been called
    expect(vi.mocked(signupUser)).not.toHaveBeenCalled();
  });

  it('switches between Sign In and Sign Up views', async () => {
    const { user } = setup(<AuthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });

    // Go to login view
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText("Don't have an account? Sign up")).toBeDefined();
    });

    // Switch to signup view
    await user.click(screen.getByText("Don't have an account? Sign up"));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeDefined();
    });
  });

  it('shows Sign Out button after successful login', async () => {
    const { user } = setup(<AuthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });

    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter username')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText('Enter username'), 'testuser');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByText('Log In'));

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeDefined();
    });

    await user.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });
  });

  it('accessibility audit', async () => {
    const wrapper = createWrapper();
    const { container } = render(<AuthWidget />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeDefined();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Presentational market widgets ──

const mockMarketForCard = {
  marketId: 1,
  title: 'Test Market',
  consensusMean: 50.0,
  config: { numBuckets: 10, lowerBound: 0, upperBound: 100, K: 10, L: 0, H: 100, P0: 1, mu: 1, epsAlpha: 0.01, tau: 1, gamma: 1, lambdaS: 0, lambdaD: 0 },
  alpha: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  consensus: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  totalMass: 1.1,
  poolBalance: 10000,
  totalVolume: 50000,
  positionsOpen: 42,
  participantCount: 100,
  resolutionState: 'open' as const,
  resolvedOutcome: null,
  xAxisUnits: 'USD',
  decimals: 2,
  createdAt: '2025-01-01T00:00:00Z',
  expiresAt: '2026-06-01T00:00:00Z',
  resolvedAt: null,
  marketType: 'standard',
  marketSubtype: null,
  metadata: {},
};

describe('MarketCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketCard market={mockMarketForCard as any} />);
    }).toThrow('MarketCard must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders market title', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('Test Market');
  });

  it('renders consensus mean with units', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('50');
    expect(container.textContent).toContain('USD');
  });

  it('renders formatted volume', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('50.0K');
  });

  it('renders formatted liquidity', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('10.0K');
    expect(container.textContent).toContain('Liquidity');
  });

  it('renders traders count', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('Traders');
  });

  it('renders status badge Active for open market', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('Active');
  });

  it('calls onSelect on card click', () => {
    const wrapper = createWrapper();
    const onSelect = vi.fn();
    const { container } = render(<MarketCard market={mockMarketForCard as any} onSelect={onSelect} />, { wrapper });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('trade button click area triggers card onSelect (no separate handler)', () => {
    const wrapper = createWrapper();
    const onSelect = vi.fn();
    const { container } = render(<MarketCard market={mockMarketForCard as any} onSelect={onSelect} />, { wrapper });
    const btn = container.querySelector('.fs-market-card-trade-btn') as HTMLElement;
    fireEvent.click(btn);
    // The trade button is a decorative span with no click handler; the click bubbles to the card
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('renders resolution date with Resolves prefix when expiresAt is set', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('Resolves');
    expect(container.textContent).toContain('Jun 1, 2026');
  });

  it('renders Resolves TBD when expiresAt is null', () => {
    const wrapper = createWrapper();
    const noExpiry = { ...mockMarketForCard, expiresAt: null };
    const { container } = render(<MarketCard market={noExpiry as any} />, { wrapper });
    expect(container.textContent).toContain('Resolves TBD');
  });

  it('renders range string from lowerBound and upperBound', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('0');
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('0 - 100');
  });

  it('renders Resolved badge when resolutionState is resolved', () => {
    const wrapper = createWrapper();
    const resolved = { ...mockMarketForCard, resolutionState: 'resolved' as const };
    const { container } = render(<MarketCard market={resolved as any} />, { wrapper });
    expect(container.textContent).toContain('Resolved');
  });

  it('renders Voided badge when resolutionState is voided', () => {
    const wrapper = createWrapper();
    const voided = { ...mockMarketForCard, resolutionState: 'voided' as const };
    const { container } = render(<MarketCard market={voided as any} />, { wrapper });
    expect(container.textContent).toContain('Voided');
  });

  it('calls onSelect on Enter keydown', () => {
    const wrapper = createWrapper();
    const onSelect = vi.fn();
    const { container } = render(<MarketCard market={mockMarketForCard as any} onSelect={onSelect} />, { wrapper });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onSelect on Space keydown', () => {
    const wrapper = createWrapper();
    const onSelect = vi.fn();
    const { container } = render(<MarketCard market={mockMarketForCard as any} onSelect={onSelect} />, { wrapper });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('renders -- instead of NaN when consensusMean is NaN', () => {
    const wrapper = createWrapper();
    const nanMean = { ...mockMarketForCard, consensusMean: NaN };
    const { container } = render(<MarketCard market={nanMean as any} />, { wrapper });
    expect(container.textContent).toContain('--');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders -- instead of NaN when totalVolume is NaN (formatCompactNumber guard)', () => {
    const wrapper = createWrapper();
    const nanVolume = { ...mockMarketForCard, totalVolume: NaN };
    const { container } = render(<MarketCard market={nanVolume as any} />, { wrapper });
    expect(container.textContent).toContain('--');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders Market Consensus label', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('Market Consensus');
  });

  it('renders Range prefix', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(container.textContent).toContain('Range:');
  });

  it('unmounts without errors', () => {
    const wrapper = createWrapper();
    const { unmount } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketCard market={mockMarketForCard as any} />, { wrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('MarketList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketList markets={[]} />);
    }).toThrow('MarketList must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders loading state with skeleton cards', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketList markets={[]} loading={true} />, { wrapper });
    expect(container.querySelector('.fs-skeleton')).toBeTruthy();
  });

  it('renders error state with error message', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketList markets={[]} error={new Error('Network error')} />, { wrapper });
    expect(container.textContent).toContain('Network error');
  });

  it('renders default empty state', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketList markets={[]} />, { wrapper });
    expect(container.textContent).toContain('No markets found');
  });

  it('renders custom empty message', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketList markets={[]} emptyMessage="Nothing here" />, { wrapper });
    expect(container.textContent).toContain('Nothing here');
  });

  it('renders correct card count', () => {
    const wrapper = createWrapper();
    const threeMarkets = [
      { ...mockMarketForCard, marketId: 1 },
      { ...mockMarketForCard, marketId: 2, title: 'Market Two' },
      { ...mockMarketForCard, marketId: 3, title: 'Market Three' },
    ];
    const { container } = render(<MarketList markets={threeMarkets as any} />, { wrapper });
    const cards = container.querySelectorAll('.fs-market-card');
    expect(cards.length).toBe(3);
  });

  it('passes onSelect through to cards', () => {
    const wrapper = createWrapper();
    const onSelect = vi.fn();
    const markets = [{ ...mockMarketForCard, marketId: 7 }];
    const { container } = render(<MarketList markets={markets as any} onSelect={onSelect} />, { wrapper });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('unmounts without errors', () => {
    const wrapper = createWrapper();
    const { unmount } = render(<MarketList markets={[]} />, { wrapper });
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketList markets={[mockMarketForCard] as any} />, { wrapper });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Overlay (internal primitive) ──

describe('Overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.style.overflow = '';
  });

  it('renders nothing when open=false', () => {
    const { container } = render(
      <Overlay open={false} onClose={vi.fn()}>
        <span>Content</span>
      </Overlay>,
    );
    expect(container.querySelector('.fs-overlay-backdrop')).toBeNull();
  });

  it('renders backdrop and panel when open=true', () => {
    const { container } = render(
      <Overlay open={true} onClose={vi.fn()}>
        <span>Content</span>
      </Overlay>,
    );
    expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
    expect(container.querySelector('.fs-overlay-panel')).not.toBeNull();
  });

  it('renders title in header as h2', () => {
    const { container } = render(
      <Overlay open={true} onClose={vi.fn()} title="Test Title">
        <span>Content</span>
      </Overlay>,
    );
    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe('Test Title');
  });

  it('renders children in body', () => {
    const { container } = render(
      <Overlay open={true} onClose={vi.fn()}>
        <span>Child Content</span>
      </Overlay>,
    );
    expect(container.textContent).toContain('Child Content');
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Overlay open={true} onClose={onClose}>
        <span>Content</span>
      </Overlay>,
    );
    const backdrop = container.querySelector('.fs-overlay-backdrop') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose on panel click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Overlay open={true} onClose={onClose}>
        <span>Content</span>
      </Overlay>,
    );
    const panel = container.querySelector('.fs-overlay-panel') as HTMLElement;
    fireEvent.click(panel);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on close button click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Overlay open={true} onClose={onClose}>
        <span>Content</span>
      </Overlay>,
    );
    const closeBtn = container.querySelector('.fs-overlay-close') as HTMLElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Overlay open={true} onClose={onClose}>
        <span>Content</span>
      </Overlay>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sets role=dialog and aria-modal on panel', () => {
    const { container } = render(
      <Overlay open={true} onClose={vi.fn()}>
        <span>Content</span>
      </Overlay>,
    );
    const panel = container.querySelector('.fs-overlay-panel') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  it('locks body scroll when open and restores on close', () => {
    const { unmount } = render(
      <Overlay open={true} onClose={vi.fn()}>
        <span>Content</span>
      </Overlay>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('unmounts without errors', () => {
    const { unmount } = render(
      <Overlay open={true} onClose={vi.fn()}>
        <span>Content</span>
      </Overlay>,
    );
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    const { container } = render(
      <main>
        <Overlay open={true} onClose={vi.fn()} title="Accessible Overlay">
          <span>Content</span>
        </Overlay>
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('traps focus within panel on Tab', () => {
    const { container } = render(
      <Overlay open={true} onClose={vi.fn()} title="Trap Test">
        <button>First</button>
        <button>Second</button>
      </Overlay>
    );
    const closeBtn = container.querySelector('.fs-overlay-close') as HTMLElement;
    const firstBtn = container.querySelector('button:not(.fs-overlay-close)') as HTMLElement; // "First" button
    // Focus the last focusable element (Second button)
    const buttons = container.querySelectorAll('button');
    const lastBtn = buttons[buttons.length - 1] as HTMLElement;
    lastBtn.focus();
    // Tab should wrap to close button (first focusable in panel)
    fireEvent.keyDown(lastBtn, { key: 'Tab' });
    // Focus should have wrapped (the handler calls preventDefault and focuses first)
    expect(document.activeElement).toBe(closeBtn);
  });
});

// ── MarketOverlay ──

describe('MarketOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.body.style.overflow = '';
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>);
    }).toThrow('MarketOverlay must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders MarketList on mount', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
  });

  it('shows loading state', () => {
    setupMocksForLoading();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    expect(container.querySelector('.fs-skeleton')).not.toBeNull();
  });

  it('shows error state', async () => {
    setupMocksForError();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.textContent).toContain('API Error');
    });
  });

  it('shows default empty message', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.textContent).toContain('No markets found');
    });
  });

  it('shows custom empty message', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay emptyMessage="Custom">{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Custom');
    });
  });

  it('opens overlay when card is clicked', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.click(card);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
    });
  });

  it('passes marketId to children render prop', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const childFn = vi.fn().mockReturnValue(<div>Layout</div>);
    const { container } = render(
      <MarketOverlay>{childFn}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.click(card);
    await waitFor(() => {
      expect(childFn).toHaveBeenCalledWith(mockMarketForCard.marketId);
    });
  });

  it('shows market title in overlay header', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    const card = container.querySelector('.fs-market-card') as HTMLElement;
    fireEvent.click(card);
    await waitFor(() => {
      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading!.textContent).toBe('Test Market');
    });
  });

  it('closes overlay on backdrop click', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-market-card') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-overlay-backdrop') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).toBeNull();
    });
  });

  it('closes overlay on Escape key', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-market-card') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).toBeNull();
    });
  });

  it('closes overlay on close button', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-market-card') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-close')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-overlay-close') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).toBeNull();
    });
  });

  it('MarketList remains mounted while overlay is open', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('.fs-market-card') as HTMLElement);
    await waitFor(() => {
      expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
    });
    // Both the market card and overlay should be present simultaneously
    expect(container.querySelector('.fs-market-card')).not.toBeNull();
    expect(container.querySelector('.fs-overlay-backdrop')).not.toBeNull();
  });

  it('passes state prop through to discoverMarkets', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue([mockMarketForCard] as any);
    const wrapper = createWrapper();
    render(
      <MarketOverlay state="open">{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(vi.mocked(discoverMarkets)).toHaveBeenCalled();
    });
    const callArgs = vi.mocked(discoverMarkets).mock.calls[0];
    expect(callArgs[1]).toEqual(expect.objectContaining({ state: 'open' }));
  });

  it('passes categories prop through to discoverMarkets', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue([mockMarketForCard] as any);
    const wrapper = createWrapper();
    render(
      <MarketOverlay categories={['crypto', 'politics']}>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(vi.mocked(discoverMarkets)).toHaveBeenCalled();
    });
    const callArgs = vi.mocked(discoverMarkets).mock.calls[0];
    expect(callArgs[1]).toEqual(expect.objectContaining({ categories: ['crypto', 'politics'] }));
  });

  it('renders MarketFilterBar by default (showFilterBar=true)', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-filter-bar')).not.toBeNull();
    });
  });

  it('does not render MarketFilterBar when showFilterBar=false', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketOverlay showFilterBar={false}>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    expect(container.querySelector('.fs-market-filter-bar')).toBeNull();
  });

  it('unmounts without errors', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { unmount } = render(
      <MarketOverlay>{(id) => <div>Layout {id}</div>}</MarketOverlay>,
      { wrapper },
    );
    await act(async () => {});
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    setupMocksForData();
    const wrapper = createWrapper();
    const { container } = render(
      <main>
        <MarketOverlay showFilterBar={false}>{(id) => <div>Layout {id}</div>}</MarketOverlay>
      </main>,
      { wrapper },
    );
    await waitFor(() => {
      expect(container.querySelector('.fs-market-card')).not.toBeNull();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── MarketFilterBar ──

describe('MarketFilterBar', () => {
  const mockFilterBarProps = {
    searchText: '',
    onSearchChange: vi.fn(),
    onSearchClear: vi.fn(),
    availableCategories: ['crypto', 'politics', 'sports'],
    selectedCategories: [] as string[],
    onToggleCategory: vi.fn(),
    sortOptions: [
      { field: 'totalVolume', label: 'Volume', defaultOrder: 'desc' as const },
      { field: 'createdAt', label: 'Newest', defaultOrder: 'desc' as const },
    ],
    activeSortField: 'totalVolume',
    sortOrder: 'desc' as const,
    onSortFieldChange: vi.fn(),
    onSortOrderToggle: vi.fn(),
    resultCount: 24,
    loading: false,
    onReset: vi.fn(),
  };

  const mockResizeObserver = vi.fn((_callback: any) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.stubGlobal('ResizeObserver', mockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when rendered without FunctionSpaceProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<MarketFilterBar {...mockFilterBarProps} />);
    }).toThrow('MarketFilterBar must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('renders search input with default placeholder "Search markets..."', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe('Search markets...');
  });

  it('renders custom placeholder when provided', () => {
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} searchPlaceholder="Find a market..." />,
      { wrapper },
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('Find a market...');
  });

  it('renders category chips for each availableCategories', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    const chips = container.querySelectorAll('.fs-market-filter-chip');
    // "All" chip + 3 category chips
    expect(chips.length).toBe(4);
  });

  it('"All" chip has aria-pressed="true" when selectedCategories empty', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    const chips = container.querySelectorAll('.fs-market-filter-chip');
    const allChip = chips[0] as HTMLElement;
    expect(allChip.textContent).toBe('All');
    expect(allChip.getAttribute('aria-pressed')).toBe('true');
  });

  it('category chip has aria-pressed="true" when in selectedCategories', () => {
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} selectedCategories={['crypto']} />,
      { wrapper },
    );
    const chips = container.querySelectorAll('.fs-market-filter-chip');
    // Find the crypto chip
    const cryptoChip = Array.from(chips).find(c => c.textContent === 'Crypto') as HTMLElement;
    expect(cryptoChip).toBeDefined();
    expect(cryptoChip.getAttribute('aria-pressed')).toBe('true');
    // "All" chip should NOT be active
    const allChip = chips[0] as HTMLElement;
    expect(allChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking category chip calls onToggleCategory with category name', () => {
    const onToggleCategory = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} onToggleCategory={onToggleCategory} />,
      { wrapper },
    );
    const chips = container.querySelectorAll('.fs-market-filter-chip');
    // Click the "Crypto" chip (index 1, since 0 is "All")
    const cryptoChip = Array.from(chips).find(c => c.textContent === 'Crypto') as HTMLElement;
    fireEvent.click(cryptoChip);
    expect(onToggleCategory).toHaveBeenCalledWith('crypto');
  });

  it('typing in search input calls onSearchChange', () => {
    const onSearchChange = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} onSearchChange={onSearchChange} />,
      { wrapper },
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bitcoin' } });
    expect(onSearchChange).toHaveBeenCalledWith('bitcoin');
  });

  it('clear button visible when searchText non-empty, calls onSearchClear', () => {
    const onSearchClear = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} searchText="bitcoin" onSearchClear={onSearchClear} />,
      { wrapper },
    );
    const clearBtn = container.querySelector('.fs-market-filter-search-clear') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    fireEvent.click(clearBtn);
    expect(onSearchClear).toHaveBeenCalled();
  });

  it('sort select shows option labels', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toBe('Volume');
    expect(options[1].textContent).toBe('Newest');
  });

  it('changing sort select calls onSortFieldChange', () => {
    const onSortFieldChange = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} onSortFieldChange={onSortFieldChange} />,
      { wrapper },
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'createdAt' } });
    expect(onSortFieldChange).toHaveBeenCalledWith('createdAt');
  });

  it('sort order button calls onSortOrderToggle', () => {
    const onSortOrderToggle = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} onSortOrderToggle={onSortOrderToggle} />,
      { wrapper },
    );
    const sortOrderBtn = container.querySelector('.fs-market-filter-sort-order') as HTMLElement;
    fireEvent.click(sortOrderBtn);
    expect(onSortOrderToggle).toHaveBeenCalled();
  });

  it('result count shows "24 markets"', () => {
    const wrapper = createWrapper();
    const { container } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    const count = container.querySelector('.fs-market-filter-count');
    expect(count).not.toBeNull();
    expect(count!.textContent).toBe('24 markets');
  });

  it('unmounts without errors', () => {
    const wrapper = createWrapper();
    const { unmount } = render(<MarketFilterBar {...mockFilterBarProps} />, { wrapper });
    expect(() => unmount()).not.toThrow();
  });

  it('accessibility audit', async () => {
    const wrapper = createWrapper();
    const { container } = render(
      <main>
        <MarketFilterBar {...mockFilterBarProps} />
      </main>,
      { wrapper },
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('applies loading class when loading=true', () => {
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} loading={true} />,
      { wrapper },
    );
    expect(container.querySelector('.fs-market-filter-loading')).not.toBeNull();
  });

  it('All chip calls onClearCategories when provided', () => {
    const onClearCategories = vi.fn();
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} onClearCategories={onClearCategories} />,
      { wrapper },
    );
    const allChip = container.querySelector('.fs-market-filter-chip');
    fireEvent.click(allChip!);
    expect(onClearCategories).toHaveBeenCalledTimes(1);
    expect(mockFilterBarProps.onReset).not.toHaveBeenCalled();
  });

  it('selected categories appear before unselected in chip order', () => {
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar
        {...mockFilterBarProps}
        availableCategories={['crypto', 'politics', 'sports', 'economics', 'science']}
        selectedCategories={['sports']}
      />,
      { wrapper },
    );
    const chips = container.querySelectorAll('.fs-market-filter-categories .fs-market-filter-chip');
    // First chip is "All", second should be the selected "Sports"
    const labels = Array.from(chips).map(c => c.textContent);
    expect(labels[0]).toBe('All');
    expect(labels[1]).toBe('Sports');
    // Sports should come before the unselected categories
    const sportsIdx = labels.indexOf('Sports');
    const cryptoIdx = labels.indexOf('Crypto');
    expect(sportsIdx).toBeLessThan(cryptoIdx);
  });

  it('does not render +More when ResizeObserver reports no overflow', () => {
    const mockObserver = vi.fn((_cb: any) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    vi.stubGlobal('ResizeObserver', mockObserver);
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar {...mockFilterBarProps} />,
      { wrapper },
    );
    const moreChip = container.querySelector('.fs-market-filter-chip-more');
    expect(moreChip).toBeNull();
    vi.unstubAllGlobals();
  });

  it('all category chips render inside the chip container', () => {
    const wrapper = createWrapper();
    const { container } = render(
      <MarketFilterBar
        {...mockFilterBarProps}
        availableCategories={['crypto', 'politics', 'sports', 'economics', 'science']}
      />,
      { wrapper },
    );
    // All chips inside the container (All + 5 categories), no +More since no overflow in jsdom
    const chips = container.querySelectorAll('.fs-market-filter-categories .fs-market-filter-chip');
    expect(chips.length).toBe(6); // All + 5 categories
    const moreChip = container.querySelector('.fs-market-filter-chip-more');
    expect(moreChip).toBeNull();
  });
});
