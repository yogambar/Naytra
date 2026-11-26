import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WalletPage } from '../pages/WalletPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WalletProvider } from '../context/WalletContext';
import {
  executeTradeInFirestore,
  executeWalletDepositInFirestore,
  getCachedWalletSnapshot,
} from '../services/firestoreService';

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
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Groww-style header, balance card, and random ₹1–₹100 signup bonus in integer paise', () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Wallet & Ledger/i })).toBeInTheDocument();
    expect(screen.getByText(/Double-entry ledger in integer paise/i)).toBeInTheDocument();
    expect(screen.getByText(/Available Balance/i)).toBeInTheDocument();

    const seededWallet = getCachedWalletSnapshot('wallet_test_uid');
    expect(seededWallet.is_virtual).toBe(false);
    expect(seededWallet.balance_paise).toBeGreaterThanOrEqual(100);
    expect(seededWallet.balance_paise).toBeLessThanOrEqual(10_000);
    expect(seededWallet.balance_paise % 100).toBe(0);

    expect(
      screen.getByText(new RegExp(`${seededWallet.balance_paise.toLocaleString('en-IN')} paise`, 'i'))
    ).toBeInTheDocument();
  });

  it('renders balance breakdown and ledger entries without signup bonus badge or virtual labels', () => {
    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Signup Bonus Credited/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Initial Bonus/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Locked/i)).toBeInTheDocument();
    expect(screen.getByText(/Realized Gains/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Net Worth/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /All Transactions/i })).toBeInTheDocument();
    expect(screen.getByText(/Welcome Signup Bonus/i)).toBeInTheDocument();
    expect(screen.getByText(/SIGNUP_BONUS/i)).toBeInTheDocument();
    expect(screen.queryByText(/paper trading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/virtual/i)).not.toBeInTheDocument();
  });

  it('adds real INR funds 1:1 using minimal BUY button and records transaction', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WalletProvider>
          <WalletPage />
        </WalletProvider>
      </MemoryRouter>
    );

    const initialPaise = getCachedWalletSnapshot('wallet_test_uid').balance_paise;
    const amountInput = screen.getByLabelText(/^Amount$/i) as HTMLInputElement;
    await user.clear(amountInput);
    await user.type(amountInput, '500');

    const buyBtn = screen.getByRole('button', { name: /^BUY$/i });
    await user.click(buyBtn);

    const expectedPaise = initialPaise + 50_000;
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`${expectedPaise.toLocaleString('en-IN')} paise`, 'i'))
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Deposited ₹500\.00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('DEPOSIT')).toBeInTheDocument();
  });

  it('withdraws INR 1:1 with Withdraw button and enforces available balance', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WalletProvider>
          <WalletPage />
        </WalletProvider>
      </MemoryRouter>
    );

    // Seed an extra ₹1,000 so withdrawal of ₹400 has plenty of balance
    await executeWalletDepositInFirestore('wallet_test_uid', 1000);
    const fundedPaise = getCachedWalletSnapshot('wallet_test_uid').balance_paise;

    // Switch to Withdraw tab
    await user.click(screen.getByRole('tab', { name: /^Withdraw$/i }));

    // Try over-withdrawing
    const withdrawInput = screen.getByLabelText(/^Amount$/i) as HTMLInputElement;
    await user.clear(withdrawInput);
    await user.type(withdrawInput, '25000');
    await user.click(screen.getByRole('button', { name: /^Withdraw$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Insufficient balance/i);

    // Valid withdrawal of ₹400
    await user.clear(withdrawInput);
    await user.type(withdrawInput, '400');
    await user.click(screen.getByRole('button', { name: /^Withdraw$/i }));

    const remainingPaise = fundedPaise - 40_000;
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`${remainingPaise.toLocaleString('en-IN')} paise`, 'i'))
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Withdrew ₹400\.00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('WITHDRAWAL')).toBeInTheDocument();
  });

  it('enforces real-money balance on trades and syncs WalletPage with DashboardPage', async () => {
    render(
      <MemoryRouter>
        <WalletProvider>
          <DashboardPage />
          <WalletPage />
        </WalletProvider>
      </MemoryRouter>
    );

    const initialPaise = getCachedWalletSnapshot('wallet_test_uid').balance_paise;

    // Buying ₹3,000 with only ₹1–₹100 bonus should reject for insufficient balance
    await expect(
      executeTradeInFirestore('wallet_test_uid', {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd.',
        side: 'BUY',
        orderMode: 'Delivery',
        priceType: 'Market',
        quantity: 2,
        executionPriceInr: 1500,
      })
    ).rejects.toThrow(/Insufficient balance/i);

    // Deposit ₹5,000 and execute the ₹3,000 RELIANCE order
    await executeWalletDepositInFirestore('wallet_test_uid', 5000);
    await executeTradeInFirestore('wallet_test_uid', {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      side: 'BUY',
      orderMode: 'Delivery',
      priceType: 'Market',
      quantity: 2,
      executionPriceInr: 1500,
    });

    const expectedPaise = initialPaise + 500_000 - 300_000;
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`${expectedPaise.toLocaleString('en-IN')} paise`, 'i'))
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/BUY \(Delivery\) 2 RELIANCE/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Open/i)).toBeInTheDocument();
  });
});
