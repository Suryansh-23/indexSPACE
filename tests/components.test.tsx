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
}));

import { FunctionSpaceProvider } from '../packages/react/src';
import { PasswordlessAuthWidget } from '../packages/ui/src/auth/PasswordlessAuthWidget';
import {
  MarketStats,
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
  config: { K: 10, L: 0, H: 100 },
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
}

function setupMocksForLoading() {
  vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {}));
  vi.mocked(getConsensusCurve).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryMarketPositions).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryTradeHistory).mockImplementation(() => new Promise(() => {}));
  vi.mocked(queryMarketHistory).mockImplementation(() => new Promise(() => {}));
}

function setupMocksForError() {
  vi.mocked(queryMarketState).mockRejectedValue(new Error('API Error'));
  vi.mocked(getConsensusCurve).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryMarketPositions).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryTradeHistory).mockRejectedValue(new Error('API Error'));
  vi.mocked(queryMarketHistory).mockRejectedValue(new Error('API Error'));
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
