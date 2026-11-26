import React, { useState, useMemo, useId } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, BarChart2 } from 'lucide-react';
import { Sparkline } from '../../design/Sparkline';
import type { MarketTicker } from '../../services/marketService';

export interface HoldingsRowData {
  symbol: string;
  name: string;
  sector: string;
  ticker: MarketTicker;
  quantity?: number;
  avgPriceInr?: number;
  investedInr?: number;
  currentValueInr?: number;
  totalReturnInr?: number;
  totalReturnPct?: number;
  orderMode?: 'Delivery' | 'Intraday';
}

export interface HoldingsTableProps {
  mode: 'holdings' | 'explore';
  rows: HoldingsRowData[];
  selectedSymbol: string | null;
  hideValues?: boolean;
  onSelectStock: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}

type SortKey = 'name' | 'price' | 'returns' | 'current';
type SortDir = 'ascending' | 'descending';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Deterministic intraday sparkline points anchored to open/low/high/close */
function buildTickerSparkline(t: MarketTicker): number[] {
  const open = t.open > 0 ? t.open : t.price;
  const close = t.price;
  const low = t.low > 0 ? Math.min(t.low, open, close) : Math.min(open, close);
  const high = t.high > 0 ? Math.max(t.high, open, close) : Math.max(open, close);
  const mid1 = open + (high - low) * ((t.change_pct ?? 0) >= 0 ? 0.25 : -0.2);
  const mid2 = (open + close) / 2;
  const mid3 = close >= open ? Math.max(mid2, high * 0.998) : Math.min(mid2, low * 1.002);
  return [open, mid1, low, mid2, mid3, high, close];
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  mode,
  rows,
  selectedSymbol,
  hideValues = false,
  onSelectStock,
  onOpenChart,
}) => {
  const captionId = useId();
  const [sortKey, setSortKey] = useState<SortKey>(mode === 'holdings' ? 'current' : 'name');
  const [sortDir, setSortDir] = useState<SortDir>(mode === 'holdings' ? 'descending' : 'ascending');
  const [sortAnnouncement, setSortAnnouncement] = useState<string>('');

  const handleSort = (key: SortKey, label: string) => {
    const nextDir: SortDir =
      sortKey === key && sortDir === 'ascending' ? 'descending' : 'ascending';
    setSortKey(key);
    setSortDir(nextDir);
    setSortAnnouncement(`Sorted by ${label}, ${nextDir}, ${rows.length} rows`);
  };

  const sortedRows = useMemo(() => {
    const factor = sortDir === 'ascending' ? 1 : -1;
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortKey === 'name') {
        return factor * collator.compare(a.name || a.symbol, b.name || b.symbol);
      }
      if (sortKey === 'price') {
        return factor * ((a.ticker.price || 0) - (b.ticker.price || 0));
      }
      if (sortKey === 'returns') {
        const va = mode === 'holdings' ? (a.totalReturnInr || 0) : (a.ticker.change_pct || 0);
        const vb = mode === 'holdings' ? (b.totalReturnInr || 0) : (b.ticker.change_pct || 0);
        return factor * (va - vb);
      }
      // current / market cap proxy
      const ca = mode === 'holdings' ? (a.currentValueInr || 0) : (a.ticker.price || 0);
      const cb = mode === 'holdings' ? (b.currentValueInr || 0) : (b.ticker.price || 0);
      return factor * (ca - cb);
    });
    return copy;
  }, [rows, sortKey, sortDir, mode]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" aria-hidden="true" />;
    }
    return sortDir === 'ascending' ? (
      <ArrowUp className="w-3 h-3 text-brand-up" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-up" aria-hidden="true" />
    );
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised overflow-hidden shadow-sm">
      <div role="status" aria-live="polite" className="sr-only">
        {sortAnnouncement}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-marigold/60"
      >
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption id={captionId} className="sr-only">
            {mode === 'holdings'
              ? 'Your current BSE equity holdings'
              : 'BSE Sensex 30 constituent stocks'}
          </caption>

          <thead className="border-b border-surface-border bg-surface-inset/50 text-[11px] font-semibold text-text-tertiary">
            <tr>
              <th
                scope="col"
                aria-sort={sortKey === 'name' ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort('name', 'Company')}
                  className="w-full px-4 py-3 flex items-center gap-1.5 text-left hover:text-text-primary transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold"
                >
                  <span>Company</span>
                  {renderSortIcon('name')}
                </button>
              </th>

              <th scope="col" className="px-3 py-3 text-center">
                1D Trend
              </th>

              <th
                scope="col"
                aria-sort={sortKey === 'price' ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort('price', 'Market price')}
                  className="w-full px-3 py-3 flex items-center justify-end gap-1.5 text-right hover:text-text-primary transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold"
                >
                  <span>Market price (1D%)</span>
                  {renderSortIcon('price')}
                </button>
              </th>

              <th
                scope="col"
                aria-sort={sortKey === 'returns' ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleSort('returns', mode === 'holdings' ? 'Returns' : '1D Change')
                  }
                  className="w-full px-3 py-3 flex items-center justify-end gap-1.5 text-right hover:text-text-primary transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold"
                >
                  <span>{mode === 'holdings' ? 'Returns (%)' : 'Day Change'}</span>
                  {renderSortIcon('returns')}
                </button>
              </th>

              {mode === 'holdings' && (
                <th
                  scope="col"
                  aria-sort={sortKey === 'current' ? sortDir : undefined}
                  className="p-0"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('current', 'Current and Invested value')}
                    className="w-full px-3 py-3 flex items-center justify-end gap-1.5 text-right hover:text-text-primary transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold"
                  >
                    <span>Current (Invested)</span>
                    {renderSortIcon('current')}
                  </button>
                </th>
              )}

              <th scope="col" className="px-3 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-border text-xs">
            {sortedRows.map((row) => {
              const isSelected = selectedSymbol?.toUpperCase() === row.symbol.toUpperCase();
              const dayPct = row.ticker.change_pct ?? 0;
              const dayChange = row.ticker.change ?? 0;
              const isDayUp = dayPct >= 0;

              const totalReturn = row.totalReturnInr ?? 0;
              const totalReturnPct = row.totalReturnPct ?? 0;
              const isReturnUp = totalReturn >= 0;

              return (
                <tr
                  key={`${row.symbol}_${row.orderMode || mode}`}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-brand-up-bg/40'
                      : 'hover:bg-surface-inset/50'
                  }`}
                >
                  {/* Company Cell */}
                  <td className="px-4 py-3.5 align-middle">
                    <button
                      type="button"
                      onClick={() => onSelectStock(row.symbol)}
                      className="text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-marigold rounded"
                    >
                      <div className="font-bold text-text-primary group-hover:text-brand-up transition-colors flex items-center gap-1.5">
                        <span>{row.name}</span>
                        {row.orderMode === 'Intraday' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Intraday
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-0.5 font-mono">
                        {mode === 'holdings' ? (
                          hideValues ? (
                            '•• shares • Avg. ₹••••'
                          ) : (
                            <>
                              {row.quantity} {row.quantity === 1 ? 'share' : 'shares'} • Avg.{' '}
                              {formatINR(row.avgPriceInr || 0)}
                            </>
                          )
                        ) : (
                          `${row.symbol} • ${row.sector}`
                        )}
                      </div>
                    </button>
                  </td>

                  {/* Sparkline Trend */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex justify-center">
                      <Sparkline
                        data={buildTickerSparkline(row.ticker)}
                        width={76}
                        height={24}
                        isPositive={isDayUp}
                      />
                    </div>
                  </td>

                  {/* Market Price (1D%) */}
                  <td className="px-3 py-3.5 text-right align-middle font-mono">
                    <div className="font-bold text-text-primary">
                      {formatINR(row.ticker.price)}
                    </div>
                    <div
                      className={`text-[11px] font-semibold ${
                        isDayUp ? 'text-brand-up' : 'text-brand-down'
                      }`}
                    >
                      {isDayUp ? '+' : ''}
                      {dayChange.toFixed(2)} ({isDayUp ? '+' : ''}
                      {dayPct.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Returns (%) or Day Change */}
                  <td className="px-3 py-3.5 text-right align-middle font-mono">
                    {mode === 'holdings' ? (
                      hideValues ? (
                        <span className="text-text-tertiary">₹••••</span>
                      ) : (
                        <>
                          <div
                            className={`font-bold ${
                              isReturnUp ? 'text-brand-up' : 'text-brand-down'
                            }`}
                          >
                            {isReturnUp ? '+' : ''}
                            {formatINR(totalReturn)}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              isReturnUp ? 'text-brand-up' : 'text-brand-down'
                            }`}
                          >
                            {isReturnUp ? '+' : ''}
                            {totalReturnPct.toFixed(2)}%
                          </div>
                        </>
                      )
                    ) : (
                      <div
                        className={`font-bold ${
                          isDayUp ? 'text-brand-up' : 'text-brand-down'
                        }`}
                      >
                        {isDayUp ? '+' : ''}
                        {dayPct.toFixed(2)}%
                      </div>
                    )}
                  </td>

                  {/* Current (Invested) in Holdings mode */}
                  {mode === 'holdings' && (
                    <td className="px-3 py-3.5 text-right align-middle font-mono">
                      {hideValues ? (
                        <span className="text-text-tertiary">₹••••</span>
                      ) : (
                        <>
                          <div className="font-bold text-text-primary">
                            {formatINR(row.currentValueInr || 0)}
                          </div>
                          <div className="text-[11px] text-text-tertiary">
                            {formatINR(row.investedInr || 0)}
                          </div>
                        </>
                      )}
                    </td>
                  )}

                  {/* Action Buttons */}
                  <td className="px-3 py-3.5 text-right align-middle">
                    <button
                      type="button"
                      onClick={() => onOpenChart(row.symbol)}
                      aria-label={`Open AI chart for ${row.name}`}
                      title="Open AI Candlestick Chart"
                      className="p-2 rounded-lg text-text-tertiary hover:text-purple-400 hover:bg-surface-inset transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
