import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { WalletProvider } from '../context/WalletContext';
import type { MarketPulseResponse } from '../services/marketService';

// Mock Capacitor haptics
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
    idToken: 'mock-token:dash_uid:arjun@example.com:true',
    user: { uid: 'dash_uid', email: 'arjun@example.com', emailVerified: true },
    profile: {
      id: 'dash_uid',
      email: 'arjun@example.com',
      name: 'Arjun Mehta',
      dob: '1994-06-15',
      profile_complete: true,
      email_verified: true,
      terms_accepted: true,
      bonus_claimed: true,
    },
    isAuthenticated: true,
  }),
}));

const { MOCK_PULSE } = vi.hoisted(() => ({
  MOCK_PULSE: {
    market: {
      is_open: true,
      status_text: 'MARKET OPEN (Closes in 2h 15m)',
      current_time_ist: '2026-11-27 13:15:00 IST',
    },
    sensex_index: {
      symbol: 'SENSEX',
      price: 84512.4,
      change: 512.4,
      change_pct: 0.61,
      advancers: 21,
      decliners: 9,
      sparkline: [84000, 84180, 84320, 84512.4],
    },
    predictions: [
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd.',
        sector: 'Energy',
        bse_code: '500325',
        price: 2980.5,
        open: 2945.0,
        high: 2992.0,
        low: 2940.0,
        change: 35.5,
        change_pct: 1.21,
        volume: 420000,
        forecast_target: 3025.0,
        forecast_delta_pct: 1.49,
        confidence_pct: 86,
        stance: 'BULLISH' as const,
        support: 2916.5,
        resistance: 3015.9,
        sparkline: [2945, 2955, 2968, 2980.5],
      },
      {
        symbol: 'TCS',
        name: 'Tata Consultancy Services Ltd.',
        sector: 'Technology',
        bse_code: '532540',
        price: 4120.0,
        open: 4050.0,
        high: 4135.0,
        low: 4042.0,
        change: 70.0,
        change_pct: 1.73,
        volume: 315000,
        forecast_target: 4195.0,
        forecast_delta_pct: 1.82,
        confidence_pct: 88,
        stance: 'BULLISH' as const,
        support: 4009.7,
        resistance: 4168.1,
        sparkline: [4050, 4075, 4100, 4120],
      },
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd.',
        sector: 'Banking',
        bse_code: '500180',
        price: 1645.25,
        open: 1662.0,
        high: 1666.0,
        low: 1640.0,
        change: -16.75,
        change_pct: -1.01,
        volume: 890000,
        forecast_target: 1630.0,
        forecast_delta_pct: -0.93,
        confidence_pct: 79,
        stance: 'BEARISH' as const,
        support: 1626.8,
        resistance: 1679.3,
        sparkline: [1662, 1656, 1648, 1645.25],
      },
    ],
    sectors: [
      {
        sector: 'Technology',
        count: 4,
        gainers: 4,
        losers: 0,
        neutral: 0,
        avg_change_pct: 1.73,
        total_volume: 315000,
        top_symbol: 'TCS',
      },
      {
        sector: 'Energy',
        count: 2,
        gainers: 2,
        losers: 0,
        neutral: 0,
        avg_change_pct: 1.21,
        total_volume: 420000,
        top_symbol: 'RELIANCE',
      },
      {
        sector: 'Banking',
        count: 5,
        gainers: 1,
        losers: 4,
        neutral: 0,
        avg_change_pct: -1.01,
        total_volume: 890000,
        top_symbol: 'HDFCBANK',
      },
    ],
    news: [
      {
        uuid: 'n1',
        symbol: 'TCS',
        sector: 'Technology',
        price: 4120,
        change_pct: 1.73,
        is_personalized: true,
        title: 'TCS Bags $1.2B Multi-Year Cloud Deal',
        summary: 'Strong BFSI cloud modernization contract announced today.',
        description: 'Cloud expansion drives higher TCV guidance.',
        url: 'https://economictimes.indiatimes.com',
        source: 'Economic Times',
        published_at: '2026-11-27T11:00:00+05:30',
        sentiment_score: 0.52,
        entities: ['TCS'],
      },
      {
        uuid: 'n2',
        symbol: 'HDFCBANK',
        sector: 'Banking',
        price: 1645.25,
        change_pct: -1.01,
        is_personalized: false,
        title: 'HDFC Bank Deposit Mix Under Review Ahead of RBI Meet',
        summary: 'Analysts monitor net interest margin trajectory.',
        description: 'Near-term credit growth remains selective.',
        url: 'https://moneycontrol.com',
        source: 'Moneycontrol',
        published_at: '2026-11-27T12:15:00+05:30',
        sentiment_score: -0.22,
        entities: ['HDFCBANK'],
      },
    ],
  } satisfies MarketPulseResponse,
}));

vi.mock('../services/marketService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/marketService')>();
  return {
    ...actual,
    fetchMarketPulse: vi.fn().mockResolvedValue(MOCK_PULSE),
    fetchStockChart: vi.fn().mockResolvedValue(null),
    fetchStockInsight: vi.fn().mockResolvedValue(null),
    fetchStockNews: vi.fn().mockResolvedValue([]),
  };
});

describe('Personalized Groww-Style DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders personalized user greeting, live market data, sectors, AI predictions, and news', async () => {
    render(
      <MemoryRouter>
        <WalletProvider>
          <DashboardPage />
        </WalletProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Market Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Arjun/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Picked for you & AI forecasts/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Top movers today/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sectors trending today/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Stocks in news today/i })).toBeInTheDocument();
    expect(screen.getByText(/TCS Bags \$1\.2B Multi-Year Cloud Deal/i)).toBeInTheDocument();
  });

  it('searches for a stock, records it in Recent Searches, and allows clearing search history', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WalletProvider>
          <DashboardPage />
        </WalletProvider>
      </MemoryRouter>
    );

    await screen.findByText(/TCS Bags/i);

    const searchInput = screen.getByRole('combobox', {
      name: /Search Sensex 30 stocks/i,
    });
    await user.click(searchInput);
    await user.type(searchInput, 'Banking');

    const hdfcOption = await screen.findByRole('option', { name: /HDFC Bank Ltd\./i });
    await user.click(hdfcOption);

    // Chart modal opens for selected stock; close it to verify activity state underneath
    const closeDialogBtn = await screen.findByRole('button', { name: /^Close$/i });
    await user.click(closeDialogBtn);

    // Search history chip should appear in activity card & badge
    await waitFor(() => {
      expect(screen.getByText(/Personalized from 1 recent search/i)).toBeInTheDocument();
    });

    // Clear history via Clear button in activity section
    const clearBtn = screen.getByRole('button', { name: /^Clear$/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Personalized from 1 recent search/i)).not.toBeInTheDocument();
    });
  });

  it('filters by sector category and switches Top Movers / Trading Screens tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WalletProvider>
          <DashboardPage />
        </WalletProvider>
      </MemoryRouter>
    );

    await screen.findByText(/Top movers today/i);

    // Select Technology sector via dropdown
    const sectorSelect = screen.getByLabelText(/Filter by sector category/i);
    await user.selectOptions(sectorSelect, 'Technology');
    expect((sectorSelect as HTMLSelectElement).value).toBe('Technology');

    // Click Trading Screen button for Intraday Pullback Watch -> sets Losers tab
    const pullbackBtn = screen.getByRole('button', { name: /Intraday Pullback Watch/i });
    await user.click(pullbackBtn);
    expect(screen.getByRole('tab', { name: /Losers/i })).toHaveAttribute('aria-selected', 'true');
  });
});
