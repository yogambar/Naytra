import { render, screen, waitFor, within } from '@testing-library/react';
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
    fetchStockChart: vi.fn().mockResolvedValue(null),
    fetchStockInsight: vi.fn().mockResolvedValue(null),
    fetchStockNews: vi.fn().mockResolvedValue([]),
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
    expect(screen.queryByRole('columnheader', { name: /Actions/i })).not.toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: /^All \(2\)$/i });
    const deliveryTab = screen.getByRole('tab', { name: /^Delivery \(1\)$/i });
    const intradayTab = screen.getByRole('tab', { name: /^Intraday \(1\)$/i });

    expect(allTab).toBeInTheDocument();
    expect(screen.getByText('Reliance Industries Ltd.')).toBeInTheDocument();
    expect(screen.getByText('Adani Ports & SEZ Ltd.')).toBeInTheDocument();

    // Clicking anywhere on the row (not the name) opens that stock in the right Order Ticket panel
    const intradaySubline = screen.getByText(/2 shares/i);
    await user.click(intradaySubline);
    expect(await screen.findByRole('tab', { name: /^BUY$/i })).toBeInTheDocument();

    // Clicking the company name opens the AI chart dialog
    const nameBtn = screen.getByRole('button', { name: /Open chart for Reliance Industries Ltd\./i });
    await user.click(nameBtn);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Close$/i }));

    // Switch to Delivery
    await user.click(deliveryTab);
    await waitFor(() => {
      const tbl = within(screen.getByRole('table'));
      expect(tbl.getByText('Reliance Industries Ltd.')).toBeInTheDocument();
      expect(tbl.queryByText('Adani Ports & SEZ Ltd.')).not.toBeInTheDocument();
    });

    // Switch to Intraday
    await user.click(intradayTab);
    await waitFor(() => {
      const tbl = within(screen.getByRole('table'));
      expect(tbl.getByText('Adani Ports & SEZ Ltd.')).toBeInTheDocument();
      expect(tbl.queryByText('Reliance Industries Ltd.')).not.toBeInTheDocument();
    });
  });
});
