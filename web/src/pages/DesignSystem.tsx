import React, { useState } from 'react';
import { Surface } from '../design/Surface';
import { Card3D } from '../design/Card3D';
import { Button } from '../design/Button';
import { Input } from '../design/Input';
import { Badge, DataModeBadge } from '../design/Badge';
import { Tabs } from '../design/Tabs';
import { Dialog } from '../design/Dialog';
import { BottomSheet } from '../design/BottomSheet';
import { Toast, type ToastVariant } from '../design/Toast';
import { Skeleton } from '../design/Skeleton';
import { NumberTicker } from '../design/NumberTicker';
import { PriceFlash } from '../design/PriceFlash';
import { Sparkline } from '../design/Sparkline';
import { ProgressRing } from '../design/ProgressRing';
import { EmptyState } from '../design/EmptyState';
import { ThemeToggle } from '../design/ThemeToggle';

import { LogoN3D } from '../three/LogoN3D';
import { CoinVirtual3D } from '../three/CoinVirtual3D';
import { CandleStack3D } from '../three/CandleStack3D';
import { LogoNFallback, CoinVirtualFallback, CandleStackFallback } from '../three/Fallbacks';

import { ArrowLeft, AlertCircle, Search, Layers, Clock, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DesignSystem: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tickerValue, setTickerValue] = useState(78450.25);
  const [priceValue, setPriceValue] = useState(1420.5);
  const [priceChange, setPriceChange] = useState(12.75);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; variant: ToastVariant }>>([
    { id: '1', title: 'Order Filled', message: 'Bought 10 RELIANCE @ ₹1,420.50', variant: 'success' },
  ]);
  const [forceFallback, setForceFallback] = useState(false);

  const sampleSparklineUp = [1400, 1408, 1404, 1412, 1410, 1418, 1422, 1420.5];
  const sampleSparklineDown = [2850, 2840, 2845, 2830, 2835, 2820, 2815, 2810];

  return (
    <div className="min-h-screen bg-surface-base text-text-primary p-4 sm:p-8 transition-colors duration-200">
      {/* Sticky Header */}
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between pb-8 mb-8 border-b border-surface-border gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to status page" className="p-2 rounded-xl bg-surface-inset hover:bg-surface-raised border border-surface-border text-text-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Naytra Design System</h1>
            <p className="text-xs text-text-secondary">3D Depth System + 4D Motion & Time Dimensions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceFallback}
              onChange={(e) => setForceFallback(e.target.checked)}
              className="rounded text-brand-marigold"
            />
            Force 2D Fallback
          </label>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        {/* Section 1: 3D Depth Foundation */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-brand-marigold" />
            <h2 className="text-xl font-bold">1. Elevation Ramp (Light from Top-Left, e0 - e5)</h2>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Six levels of elevation. In light mode, dual-layer key + ambient drop shadows. In dark mode, lighter surface tints with a 1px top highlight.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {(['e0', 'e1', 'e2', 'e3', 'e4', 'e5'] as const).map((el) => (
              <Surface
                key={el}
                elevation={el}
                variant="raised"
                className="h-28 flex flex-col items-center justify-center p-3 text-center"
              >
                <span className="font-mono font-bold text-sm">{el.toUpperCase()}</span>
                <span className="text-[10px] text-text-tertiary mt-1">
                  {el === 'e0' ? 'Flat surface' : el === 'e1' ? 'Subtle card' : el === 'e2' ? 'Interactive card' : el === 'e3' ? 'Floating sheet' : el === 'e4' ? 'Dropdown / popover' : 'Modal dialog'}
                </span>
              </Surface>
            ))}
          </div>
        </section>

        {/* Section 2: Surfaces */}
        <section>
          <h2 className="text-xl font-bold mb-4">2. Surface Types</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Surface variant="raised" elevation="e2" className="p-5">
              <span className="font-semibold text-sm">Raised Surface</span>
              <p className="text-xs text-text-secondary mt-1">Cards, tables, list items.</p>
            </Surface>

            <Surface variant="inset" className="p-5">
              <span className="font-semibold text-sm">Inset Surface</span>
              <p className="text-xs text-text-secondary mt-1">Inputs, recessed wells, tabs.</p>
            </Surface>

            <Surface variant="glass" elevation="e3" className="p-5">
              <span className="font-semibold text-sm">Glass Surface</span>
              <p className="text-xs text-text-secondary mt-1">Backdrop blur with inner highlight.</p>
            </Surface>

            <Surface variant="hero" elevation="e3" className="p-5">
              <span className="font-semibold text-sm">Hero Surface</span>
              <p className="text-xs text-text-secondary mt-1">Soft gradient for wallet & balance cards.</p>
            </Surface>
          </div>
        </section>

        {/* Section 3: Interactive 3D Cards */}
        <section>
          <h2 className="text-xl font-bold mb-4">3. 3D Tactile Cards (Tilt on Fine Pointer, Press Depth)</h2>
          <p className="text-xs text-text-secondary mb-4">
            Hover with mouse to see 3D perspective tilt (max 6°). Touch/click to experience keycap press depth.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card3D elevation="e2" className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-text-tertiary">RELIANCE</span>
                <Sparkline data={sampleSparklineUp} width={80} height={24} isPositive={true} />
              </div>
              <p className="text-base font-bold font-mono">₹1,420.50</p>
              <p className="text-xs text-brand-up font-semibold mt-1">+1.24% today</p>
            </Card3D>

            <Card3D elevation="e2" className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-text-tertiary">TCS</span>
                <Sparkline data={sampleSparklineDown} width={80} height={24} isPositive={false} />
              </div>
              <p className="text-base font-bold font-mono">₹2,810.00</p>
              <p className="text-xs text-brand-down font-semibold mt-1">-0.85% today</p>
            </Card3D>

            <Card3D elevation="e2" className="p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-text-tertiary">INR WALLET</span>
                <p className="text-base font-bold font-mono mt-1 text-brand-marigold-text">₹100.00</p>
              </div>
              <p className="text-[11px] text-text-tertiary mt-4">Double-entry INR balance</p>
            </Card3D>
          </div>
        </section>

        {/* Section 4: Controls & Keycap Buttons */}
        <section>
          <h2 className="text-xl font-bold mb-4">4. Controls & 3D Keycap Buttons</h2>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary Keycap</Button>
              <Button variant="secondary">Secondary Keycap</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Keycap</Button>
              <Button variant="primary" loading>Loading...</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
              <Input
                label="Stock Search"
                placeholder="Search Sensex 30..."
                leftIcon={<Search className="w-4 h-4" />}
                helperText="Try 'HDFC' or 'INFY'"
              />
              <Input
                label="Order Quantity"
                type="number"
                defaultValue={10}
                helperText="Whole shares only"
              />
              <Input
                label="Error State"
                defaultValue="invalid"
                error="Insufficient balance"
              />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 items-center">
              <DataModeBadge mode="REPLAY" />
              <DataModeBadge mode="DEMO" />
              <Badge variant="live" pulse>LIVE</Badge>
              <Badge variant="success">Executed</Badge>
              <Badge variant="error">Rejected</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="default">Sensex 30</Badge>
            </div>
          </div>
        </section>

        {/* Section 5: 4D Time Dimension & Live Motion */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-brand-marigold" />
            <h2 className="text-xl font-bold">5. 4D Time Dimension & Live Motion</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Number Ticker */}
            <Card3D elevation="e2" className="p-5">
              <span className="text-xs font-semibold text-text-secondary">Rolling Number Ticker</span>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                <NumberTicker value={tickerValue} prefix="₹" decimals={2} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => setTickerValue((v) => v + 500)}>+₹500</Button>
                <Button size="sm" variant="secondary" onClick={() => setTickerValue((v) => Math.max(0, v - 500))}>-₹500</Button>
              </div>
            </Card3D>

            {/* Price Flash */}
            <Card3D elevation="e2" className="p-5">
              <span className="text-xs font-semibold text-text-secondary">Price Flash on Change</span>
              <div className="mt-2">
                <PriceFlash value={priceValue} change={priceChange} changePct={(priceChange / priceValue) * 100} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => { setPriceValue((p) => p + 5); setPriceChange(5); }}>Tick Up</Button>
                <Button size="sm" variant="secondary" onClick={() => { setPriceValue((p) => p - 5); setPriceChange(-5); }}>Tick Down</Button>
              </div>
            </Card3D>

            {/* Progress Ring */}
            <Card3D elevation="e2" className="p-5 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-text-secondary mb-3">Replay Clock Progress</span>
              <ProgressRing progress={65} size={64} strokeWidth={6} showText={true} />
              <span className="text-[11px] text-text-tertiary mt-2">13:45 / 15:30 IST</span>
            </Card3D>
          </div>
        </section>

        {/* Section 6: Overlays & Modals */}
        <section>
          <h2 className="text-xl font-bold mb-4">6. Overlays: Dialog & BottomSheet</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open Dialog (Desktop)</Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Bottom Sheet (Mobile)</Button>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="BSE Sensex 30 Trading Notice"
            description="Order execution environment with double-entry ledger."
          >
            <p className="text-sm text-text-secondary">
              Naytra tracks every order, deposit, withdrawal, and holding using integer-paise double-entry ledger entries.
            </p>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => setDialogOpen(false)}>I Understand</Button>
            </div>
          </Dialog>

          <BottomSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Stock Quick Details"
            description="BSE Sensex 30 constituent overview."
          >
            <div className="space-y-3">
              <div className="flex justify-between text-xs py-1 border-b border-surface-border">
                <span className="text-text-secondary">Symbol</span>
                <span className="font-bold">RELIANCE</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-surface-border">
                <span className="text-text-secondary">Day Range</span>
                <span className="font-mono">₹1,405.00 – ₹1,432.00</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-text-secondary">Estimated Slippage</span>
                <span className="font-mono">5 bps (0.05%)</span>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="primary" className="w-full" onClick={() => setSheetOpen(false)}>Close Sheet</Button>
            </div>
          </BottomSheet>
        </section>

        {/* Section 7: Tabs & Skeletons */}
        <section>
          <h2 className="text-xl font-bold mb-4">7. Sliding Raised Pill Tabs & Shimmer Skeleton</h2>
          <div className="space-y-6">
            <Tabs
              items={[
                { id: 'gainers', label: 'Top Gainers', content: <p className="text-xs text-text-secondary p-3">Gainers list loaded with tactile animations.</p> },
                { id: 'losers', label: 'Top Losers', content: <p className="text-xs text-text-secondary p-3">Losers list loaded with tactile animations.</p> },
                { id: 'all', label: 'All 30 Stocks', content: <p className="text-xs text-text-secondary p-3">Full BSE Sensex 30 universe.</p> },
              ]}
            />

            <div className="space-y-2 max-w-md">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="rectangular" height="4rem" />
              <div className="flex gap-2">
                <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Toasts & Empty State */}
        <section>
          <h2 className="text-xl font-bold mb-4">8. Toast Notifications & Empty State</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              {toasts.map((t) => (
                <Toast
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  message={t.message}
                  variant={t.variant}
                  onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
                />
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setToasts((prev) => [
                    ...prev,
                    { id: String(Date.now()), title: 'Price Alert', message: 'Sensex crossed 78,500', variant: 'info' },
                  ])
                }
              >
                Trigger New Toast
              </Button>
            </div>

            <EmptyState
              icon={<AlertCircle className="w-8 h-8 text-brand-marigold" />}
              title="No Watchlist Items"
              description="Star any of the Sensex 30 stocks to monitor price movements in real time."
              action={<Button size="sm" variant="primary">Add Stocks</Button>}
            />
          </div>
        </section>

        {/* Section 9: 3D Procedural WebGL Scenes */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Box className="w-5 h-5 text-brand-marigold" />
            <h2 className="text-xl font-bold">9. 3D Procedural WebGL Objects & 2D Fallbacks</h2>
          </div>
          <p className="text-xs text-text-secondary mb-6">
            Procedural three.js scenes with top-left directional lighting, DPR capping (max 2), context-loss resilience, and automatic fallback for reduced motion or low-tier GPUs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Logo N 3D */}
            <Card3D elevation="e2" className="p-6 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-text-tertiary mb-3">LOGO N 3D</span>
              {forceFallback ? <LogoNFallback size={180} /> : <LogoN3D size={180} />}
              <p className="text-xs text-text-secondary mt-3">Two candlesticks + Marigold diagonal</p>
            </Card3D>

            {/* Bonus Coin 3D */}
            <Card3D elevation="e2" className="p-6 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-text-tertiary mb-3">BONUS COIN 3D</span>
              {forceFallback ? <CoinVirtualFallback size={180} /> : <CoinVirtual3D size={180} />}
              <p className="text-xs text-text-secondary mt-3">Gold metallic rotating coin for bonus reveal</p>
            </Card3D>

            {/* CandleStack 3D */}
            <Card3D elevation="e2" className="p-6 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-text-tertiary mb-3">CANDLE STACK 3D</span>
              {forceFallback ? <CandleStackFallback size={180} /> : <CandleStack3D size={180} />}
              <p className="text-xs text-text-secondary mt-3">Empty-state 3D candlestick composition</p>
            </Card3D>
          </div>
        </section>
      </main>
    </div>
  );
};
