import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WalletPage } from '../pages/WalletPage';

// Mock Capacitor plugins
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Error: 'ERROR' },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    idToken: 'mock-token:wallet_test_uid:trader@example.com:true',
    user: { uid: 'wallet_test_uid', email: 'trader@example.com' },
    isAuthenticated: true,
  }),
}));

describe('WalletPage Component', () => {

  it('renders header, paper funds badge, and integer paise subtitle', async () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Virtual Wallet & Ledger/i })).toBeInTheDocument();
    expect(screen.getByText(/Paper Funds Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Double-entry ledger in integer paise/i)).toBeInTheDocument();
  });

  it('renders available virtual cash in integer paise and ₹ currency', async () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Available Virtual Cash/i)).toBeInTheDocument();
    expect(screen.getByText(/10,00,000 paise/i)).toBeInTheDocument();
  });

  it('renders virtual signup bonus disclosure card', async () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    const bonusBadges = screen.getAllByText(/Virtual Signup Bonus/i);
    expect(bonusBadges.length).toBeGreaterThan(0);
    expect(screen.getByText(/Credited:.*once per account/i)).toBeInTheDocument();
  });

  it('renders breakdown columns including initial grant and locked funds', async () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Initial Grant/i)).toBeInTheDocument();
    expect(screen.getByText(/Locked in Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Realized Gains/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Net Worth/i)).toBeInTheDocument();
  });

  it('renders disclaimer and double-entry ledger transactions table', async () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Virtual Funds Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/Double-Entry Ledger Transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/Initial Virtual Signup Bonus/i)).toBeInTheDocument();
    expect(screen.getByText(/SIGNUP_BONUS/i)).toBeInTheDocument();
  });
});
