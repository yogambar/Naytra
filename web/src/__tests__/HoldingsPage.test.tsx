import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HoldingsPage } from '../pages/HoldingsPage';
import { WalletProvider } from '../context/WalletContext';
import {
  executeTradeInFirestore,
  executeWalletDepositInFirestore,
} from '../services/firestoreService';

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Error: 'ERROR' },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    idToken: 'mock-token:hold_uid:trader@example.com:true',
    user: { uid: 'hold_uid', email: 'trader@example.com', emailVerified: true },
    profile: { id: 'hold_uid', email: 'trader@example.com', name: 'Riya Sharma' },
    isAuthenticated: true,
  }),
}));

vi.mock('../services/marketService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/marketService')>();
  return {
    ...actual,
    fetchMarketTickers: vi.fn().mockResolvedValue([
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd.',
        sector: 'Energy',
        bse_code: '500325',
        price: 3000,
        open: 2980,
        high: 3010,
        low: 2975,
        change: 20,
        change_pct: 0.67,
        volume: 150000,
      },
      {
        symbol: 'ADANIPORTS',
        name: 'Adani Ports & SEZ Ltd.',
        sector: 'Infrastructure',
        bse_code: '532921',
        price: 1500,
        open: 1490,
        high: 1510,
        low: 1485,
        change: 10,
        change_pct: 0.67,
        volume: 95000,
      },
    ]),
  };
});

describe('HoldingsPage Segments (All / Delivery / Intraday)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows only holdings with All, Delivery, and Intraday segments and no Sensex 30 explore tab', async () => {
    await executeWalletDepositInFirestore('hold_uid', 20000);
    await executeTradeInFirestore('hold_uid', {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      side: 'BUY',
      orderMode: 'Delivery',
      priceType: 'Market',
      quantity: 1,
      executionPriceInr: 3000,
    });
    await executeTradeInFirestore('hold_uid', {
      symbol: 'ADANIPORTS',
      name: 'Adani Ports & SEZ Ltd.',
      side: 'BUY',
      orderMode: 'Intraday',
      priceType: 'Market',
      quantity: 2,
      executionPriceInr: 1500,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WalletProvider>
          <HoldingsPage />
        </WalletProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /^Holdings$/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Sensex 30/i })).not.toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: /^All \(2\)$/i });
    const deliveryTab = screen.getByRole('tab', { name: /^Delivery \(1\)$/i });
    const intradayTab = screen.getByRole('tab', { name: /^Intraday \(1\)$/i });

    expect(allTab).toBeInTheDocument();
    expect(screen.getByText('Reliance Industries Ltd.')).toBeInTheDocument();
    expect(screen.getByText('Adani Ports & SEZ Ltd.')).toBeInTheDocument();

    // Switch to Delivery
    await user.click(deliveryTab);
    await waitFor(() => {
      expect(screen.getByText('Reliance Industries Ltd.')).toBeInTheDocument();
      expect(screen.queryByText('Adani Ports & SEZ Ltd.')).not.toBeInTheDocument();
    });

    // Switch to Intraday
    await user.click(intradayTab);
    await waitFor(() => {
      expect(screen.getByText('Adani Ports & SEZ Ltd.')).toBeInTheDocument();
      expect(screen.queryByText('Reliance Industries Ltd.')).not.toBeInTheDocument();
    });
  });
});
