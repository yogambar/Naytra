import React from 'react';

export const LogoNFallback: React.FC<{ size?: number; className?: string }> = ({ size = 120, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`relative flex items-center justify-center p-3 select-none ${className}`}
    aria-hidden="true"
  >
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Left green candlestick (Bullish) */}
      <line x1="25" y1="12" x2="25" y2="88" stroke="var(--brand-up)" strokeWidth="3" strokeLinecap="round" />
      <rect x="17" y="28" width="16" height="44" rx="4" fill="var(--brand-up)" />

      {/* Right red candlestick (Bearish) */}
      <line x1="75" y1="12" x2="75" y2="88" stroke="var(--brand-down)" strokeWidth="3" strokeLinecap="round" />
      <rect x="67" y="32" width="16" height="40" rx="4" fill="var(--brand-down)" />

      {/* Diagonal Marigold connector creating the 'N' */}
      <path
        d="M25 32 L75 68"
        stroke="var(--brand-marigold)"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const CoinVirtualFallback: React.FC<{ size?: number; className?: string }> = ({ size = 120, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`relative flex items-center justify-center p-3 select-none ${className}`}
    aria-hidden="true"
  >
    <div
      className="w-full h-full rounded-full border-4 border-brand-marigold bg-gradient-to-tr from-amber-600 via-brand-marigold to-amber-300 flex flex-col items-center justify-center shadow-lg"
      style={{ boxShadow: '0 8px 24px rgba(242, 169, 59, 0.35)' }}
    >
      <span className="font-extrabold text-brand-ink text-3xl font-mono">N</span>
      <span className="text-[9px] font-bold tracking-widest text-brand-ink uppercase -mt-0.5">VIRTUAL</span>
    </div>
  </div>
);

export const CandleStackFallback: React.FC<{ size?: number; className?: string }> = ({ size = 120, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`relative flex items-center justify-center p-3 select-none ${className}`}
    aria-hidden="true"
  >
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <line x1="25" y1="20" x2="25" y2="80" stroke="var(--brand-up)" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="35" width="10" height="30" rx="2" fill="var(--brand-up)" opacity="0.85" />

      <line x1="50" y1="15" x2="50" y2="85" stroke="var(--brand-down)" strokeWidth="2" strokeLinecap="round" />
      <rect x="45" y="25" width="10" height="45" rx="2" fill="var(--brand-down)" opacity="0.85" />

      <line x1="75" y1="25" x2="75" y2="75" stroke="var(--brand-up)" strokeWidth="2" strokeLinecap="round" />
      <rect x="70" y="40" width="10" height="20" rx="2" fill="var(--brand-up)" opacity="0.85" />
    </svg>
  </div>
);
