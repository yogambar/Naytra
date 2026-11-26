import React from 'react';
import { Card3D } from '../design/Card3D';
import { DataModeBadge } from '../design/Badge';
import { Button } from '../design/Button';
import { ThemeToggle } from '../design/ThemeToggle';
import { LogoN3D } from '../three/LogoN3D';
import { Activity, ShieldCheck, Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StatusPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col p-4 sm:p-8">
      {/* Top Navbar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-ink flex items-center justify-center font-bold text-brand-marigold font-mono border border-brand-marigold/40">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-text-primary">Naytra</h1>
            <p className="text-[11px] text-text-tertiary">BSE Sensex 30 Trading</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DataModeBadge mode="REPLAY" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center items-center py-6">
        <div className="w-full max-w-xl text-center flex flex-col items-center">
          {/* 3D Logo Mark */}
          <div className="mb-4">
            <LogoN3D size={160} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Naytra is running
          </h2>
          <p className="text-sm text-text-secondary mt-2 max-w-md">
            Trading platform for the BSE Sensex 30 with INR wallet, double-entry ledger, and deterministic market data.
          </p>

          {/* System Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-8 text-left">
            <Card3D elevation="e2" className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-up-bg text-brand-up">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary uppercase">Security</p>
                <p className="text-xs font-bold text-text-primary">Hardened baseline</p>
              </div>
            </Card3D>

            <Card3D elevation="e2" className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-marigold-bg text-brand-marigold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary uppercase">Data Mode</p>
                <p className="text-xs font-bold text-text-primary">Replay Engine</p>
              </div>
            </Card3D>

            <Card3D elevation="e2" className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-up-bg text-brand-up">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-text-tertiary uppercase">FastAPI Health</p>
                <p className="text-xs font-bold text-text-primary">200 OK</p>
              </div>
            </Card3D>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link to="/design">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Design System
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-tertiary gap-2">
        <p>© 2026 Naytra. BSE Sensex 30 Trading Platform.</p>
        <p className="font-mono text-[11px]">M0 Foundation + Step 1 Design Verified</p>
      </footer>
    </div>
  );
};
