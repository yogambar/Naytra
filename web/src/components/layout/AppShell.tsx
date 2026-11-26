import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, TrendingUp, BookOpen, Wallet, User, Activity, Palette } from 'lucide-react';
import { useMotionPrefs } from '../../hooks/useMotionPrefs';
import { useAndroidBack } from '../../hooks/useAndroidBack';
import { useStatusBar } from '../../hooks/useStatusBar';
import { hapticTick } from '../../utils/haptics';
import { ThemeToggle } from '../../design/ThemeToggle';
import { useSyncedWallet } from '../../context/WalletContext';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'holdings', path: '/holdings', label: 'Holdings', icon: TrendingUp },
  { id: 'learn', path: '/learn', label: 'Learn', icon: BookOpen },
  { id: 'wallet', path: '/wallet', label: 'Wallet', icon: Wallet },
  { id: 'profile', path: '/profile', label: 'Profile', icon: User },
];

export const AppShell: React.FC = () => {
  const location = useLocation();
  const { prefersReducedMotion } = useMotionPrefs();
  const { wallet } = useSyncedWallet();

  // Register native Android back button and status bar styling
  useAndroidBack();
  useStatusBar();

  const handleTabClick = () => {
    hapticTick();
  };

  const balanceRaw = (wallet?.balance_paise ?? 0) / 100;
  const syncedCashFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: balanceRaw < 1000 ? 2 : 0,
  }).format(balanceRaw);

  return (
    <div
      className="min-h-screen bg-surface-base text-text-primary flex flex-col md:flex-row transition-colors duration-200"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ── Desktop Navigation Rail (Visible on md and up) ──────────── */}
      <aside
        aria-label="Desktop primary navigation"
        className="hidden md:flex flex-col justify-between w-64 border-r border-surface-border bg-surface-raised p-4 sticky top-0 h-screen z-20 shrink-0"
      >
        <div className="space-y-6">
          {/* Logo Branding */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-xl bg-brand-ink flex items-center justify-center font-bold text-brand-marigold font-mono border border-brand-marigold/40 shadow-sm">
              N
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-text-primary">Naytra</div>
              <div className="text-[10px] text-text-tertiary tracking-wider uppercase font-semibold">
                BSE Sensex 30
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main sidebar menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={handleTabClick}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                    isActive
                      ? 'bg-surface-inset text-text-primary shadow-sm border border-surface-border'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-indicator"
                      className="absolute left-1 w-1 h-5 rounded-full bg-brand-marigold"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-marigold' : 'text-text-tertiary'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.id === 'wallet' && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-base text-brand-up border border-brand-up/30">
                      {syncedCashFormatted}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Rail Actions */}
        <div className="pt-4 border-t border-surface-border space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-text-tertiary">Theme</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between px-2 text-xs">
            <NavLink
              to="/design"
              className="text-text-tertiary hover:text-brand-marigold transition-colors flex items-center gap-1 font-semibold"
            >
              <Palette className="w-3.5 h-3.5" />
              Design System
            </NavLink>
            <NavLink
              to="/status"
              className="text-text-tertiary hover:text-brand-up transition-colors flex items-center gap-1 font-semibold"
            >
              <Activity className="w-3.5 h-3.5" />
              API Status
            </NavLink>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area with Shared-Axis Page Transitions ────── */}
      {/* overflow-x-clip prevents horizontal bleed without creating a scroll container that breaks position:sticky */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 pb-28 md:pb-8 max-w-full overflow-x-clip">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Navigation Bar (Floating Raised Pill) ─────── */}
      <nav
        aria-label="Mobile primary navigation"
        className="md:hidden fixed bottom-3 left-4 right-4 z-40"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          className="mx-auto max-w-md rounded-2xl bg-surface-glass backdrop-blur-xl border border-surface-border p-1.5 flex items-center justify-around shadow-lg"
          style={{
            boxShadow: 'var(--shadow-e4)',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={handleTabClick}
                className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all select-none min-w-[56px] min-h-[44px]"
                aria-label={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-pill"
                    className="absolute inset-0 rounded-xl bg-surface-inset border border-surface-border shadow-inner"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ y: isActive && !prefersReducedMotion ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-brand-marigold' : 'text-text-tertiary'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold mt-0.5 tracking-tight transition-colors ${
                      isActive ? 'text-text-primary' : 'text-text-tertiary'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
