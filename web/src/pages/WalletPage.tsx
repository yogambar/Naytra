import React from 'react';
import { Card3D } from '../design/Card3D';
import { Skeleton } from '../design/Skeleton';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, Info } from 'lucide-react';

export const WalletPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Virtual Wallet & Ledger
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-marigold-bg text-brand-marigold-text border border-brand-marigold/30">
            Paper Funds Only
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Immutable double-entry ledger in integer paise (zero floating-point math)
        </p>
      </div>

      {/* Main Balance Hero Card */}
      <Card3D elevation="e3" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Available Virtual Cash
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-text-primary">
                ₹5,385.50
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                (538,550 paise)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-inset border border-surface-border flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-up" />
            <div className="text-xs">
              <span className="font-bold text-text-primary block">Virtual Signup Bonus</span>
              <span className="text-text-tertiary">Credited: ₹10,000.00 once per account</span>
            </div>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-surface-border">
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Initial Grant</span>
            <span className="text-sm font-bold font-mono text-text-primary">₹10,000.00</span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Locked in Positions</span>
            <span className="text-sm font-bold font-mono text-text-primary">₹4,855.00</span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Realized Gains</span>
            <span className="text-sm font-bold font-mono text-brand-up">+₹240.50</span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase block">Total Net Worth</span>
            <span className="text-sm font-bold font-mono text-text-primary">₹10,240.50</span>
          </div>
        </div>
      </Card3D>

      {/* Ethics & Legal Notice */}
      <div className="p-4 rounded-xl bg-surface-inset border border-surface-border flex items-start gap-3">
        <Info className="w-5 h-5 text-text-tertiary shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Virtual Funds Disclaimer:</strong> All funds displayed are strictly virtual paper-trading currency for educational simulation. No actual bank accounts, payment gateways, withdrawals, or real-money transactions exist.
        </p>
      </div>

      {/* Double-Entry Ledger Transactions Table */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-text-primary">Ledger Transactions</h2>

        <div className="space-y-2">
          {[
            {
              id: 'tx_01',
              desc: 'Initial Signup Bonus Credit',
              type: 'CREDIT',
              amount: '+₹10,000.00',
              balance: '₹10,000.00',
              date: '15 Nov 2026, 09:15 AM',
              isCredit: true,
            },
            {
              id: 'tx_02',
              desc: 'BUY RELIANCE (1 Share @ ₹2,910.00)',
              type: 'DEBIT',
              amount: '-₹2,910.00',
              balance: '₹7,090.00',
              date: '15 Nov 2026, 09:30 AM',
              isCredit: false,
            },
            {
              id: 'tx_03',
              desc: 'BUY INFY (1 Share @ ₹1,945.00)',
              type: 'DEBIT',
              amount: '-₹1,945.00',
              balance: '₹5,145.00',
              date: '15 Nov 2026, 10:00 AM',
              isCredit: false,
            },
            {
              id: 'tx_04',
              desc: 'Dividend Simulation Credit',
              type: 'CREDIT',
              amount: '+₹240.50',
              balance: '₹5,385.50',
              date: '15 Nov 2026, 10:30 AM',
              isCredit: true,
            },
          ].map((tx) => (
            <Card3D
              key={tx.id}
              elevation="e1"
              className="p-4 flex items-center justify-between hover:border-brand-marigold/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.isCredit
                      ? 'bg-brand-up-bg text-brand-up'
                      : 'bg-surface-inset text-text-secondary'
                  }`}
                >
                  {tx.isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary">{tx.desc}</div>
                  <div className="text-xs text-text-tertiary">{tx.date}</div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-bold font-mono ${
                    tx.isCredit ? 'text-brand-up' : 'text-text-primary'
                  }`}
                >
                  {tx.amount}
                </div>
                <div className="text-[11px] font-mono text-text-tertiary">
                  Bal: {tx.balance}
                </div>
              </div>
            </Card3D>
          ))}

          {/* Skeleton transaction row */}
          <div className="p-4 rounded-xl bg-surface-raised border border-surface-border opacity-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton width="36px" height="36px" className="rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton width="180px" height="14px" />
                <Skeleton width="100px" height="11px" />
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton width="70px" height="14px" />
              <Skeleton width="60px" height="11px" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
