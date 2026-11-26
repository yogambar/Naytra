import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

// Mock Capacitor plugins
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    minimizeApp: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Error: 'ERROR' },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

// Mock AuthContext to provide an active authenticated user
vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      user: { uid: 'test_uid', email: 'trader@example.com', emailVerified: true },
      profile: {
        id: 'test_uid',
        email: 'trader@example.com',
        name: 'Test Trader',
        dob: '1990-01-01',
        profile_complete: true,
        email_verified: true,
        terms_accepted: true,
        bonus_claimed: true,
      },
      idToken: 'mock-token:test_uid:trader@example.com:true',
      error: null,
      clearError: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      sendPasswordReset: vi.fn(),
      resendVerificationEmail: vi.fn(),
      completeUserProfile: vi.fn(),
      refreshProfile: vi.fn(),
      logout: vi.fn(),
      loginWithMockUser: vi.fn(),
    }),
  };
});

describe('AppShell & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dashboard as initial route with portfolio summary', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Market Dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/Total Portfolio/i)).toBeInTheDocument();
  });

  it('navigates to Holdings page when Holdings tab is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Click Holdings tab
    const holdingsLinks = screen.getAllByRole('link', { name: /Holdings/i });
    fireEvent.click(holdingsLinks[0]);

    expect(await screen.findByRole('heading', { name: /^Holdings$/i })).toBeInTheDocument();
    const mainEl = document.querySelector('main');
    expect(mainEl).toHaveClass('overflow-x-clip');
    expect(mainEl).not.toHaveClass('overflow-x-hidden');
    expect(screen.getByTestId('holdings-sticky-panel')).toHaveClass('lg:sticky');

    // Segmented controls show All, Delivery, Intraday without Sensex 30 explore tab
    expect(screen.getByRole('tab', { name: /^All \(/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Delivery \(/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Intraday \(/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Sensex 30/i })).not.toBeInTheDocument();

    // Outer wrapper must have w-full so switching segments keeps card sizes identical
    const heading = screen.getByRole('heading', { name: /^Holdings$/i });
    const pageRoot = heading.closest('.max-w-7xl');
    expect(pageRoot).toHaveClass('w-full');

    // Sidebar Wallet icon must have shrink-0 so large amounts never squish it
    const walletLinks = screen.getAllByRole('link', { name: /Wallet/i });
    const walletSvg = walletLinks[0].querySelector('svg');
    expect(walletSvg).toHaveClass('shrink-0');
  });

  it('navigates to Learn page when Learn tab is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    const learnLinks = screen.getAllByRole('link', { name: /Learn/i });
    fireEvent.click(learnLinks[0]);

    expect(await screen.findByRole('heading', { name: /Market Academy/i })).toBeInTheDocument();
    expect(screen.getByText(/AI forecasting is coming in Phase 2/i)).toBeInTheDocument();
  });

  it('navigates to Wallet page and shows integer paise breakdown', async () => {
    render(
      <MemoryRouter initialEntries={['/wallet']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Wallet & Ledger/i })).toBeInTheDocument();
    expect(await screen.findByText(/[1-9][0-9,]* paise/i)).toBeInTheDocument();
    expect(await screen.findByText(/Double-entry ledger in integer paise/i)).toBeInTheDocument();
  });

  it('navigates to Profile page and shows Capacitor native settings', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Profile & Settings/i })).toBeInTheDocument();
    expect(await screen.findByText(/com\.rgc\.naytra/i)).toBeInTheDocument();
    expect(await screen.findByRole('switch', { name: '' })).toBeInTheDocument();
  });
});
