import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock @functionspace/core (used directly by PasswordlessAuthWidget for validateUsername, PASSWORD_REQUIRED)
vi.mock('@functionspace/core', () => ({
  FSClient: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
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
  calculateBucketDistribution: vi.fn(),
  computePercentiles: vi.fn(),
  generateCustomShape: vi.fn(),
  generateBellShape: vi.fn(),
  computeStatistics: vi.fn().mockReturnValue({ mode: 100, mean: 100, median: 100, variance: 25, stdDev: 5 }),
  pixelToDataX: vi.fn(),
  computeZoomedDomain: vi.fn(),
  computePannedDomain: vi.fn(),
  filterVisibleData: vi.fn(),
}));

import { FunctionSpaceProvider } from '../packages/react/src';
import { PasswordlessAuthWidget } from '../packages/ui/src/auth/PasswordlessAuthWidget';

const mockConfig = {
  baseUrl: 'https://test.api.com',
};

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <FunctionSpaceProvider config={mockConfig} theme="fs-dark">
        {children}
      </FunctionSpaceProvider>
    );
  };
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
    }).toThrow();

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
});
