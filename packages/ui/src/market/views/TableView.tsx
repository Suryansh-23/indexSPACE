import React, { useContext, useState, useMemo } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber, formatValue, getStatusConfig, formatConsensus } from './viewUtils.js';
import '../../styles/base.css';

export interface TableViewProps {
  markets: MarketState[];
  onSelect?: (marketId: number) => void;
}

type SortKey = 'default' | 'totalVolume' | 'positionsOpen' | 'poolBalance' | 'expiresAt';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'totalVolume', label: 'Volume' },
  { key: 'positionsOpen', label: 'Positions' },
  { key: 'poolBalance', label: 'Liquidity' },
  { key: 'expiresAt', label: 'Closing' },
];

const ROW_LIMIT = 20;

// Decorative constants representing real-world medal colors, intentionally not theme tokens
const RANK_COLORS: Record<string, string> = {
  gold: '#fbbf24',
  silver: '#94a3b8',
  bronze: '#d97706',
};

function getRankColor(index: number): string | undefined {
  if (index === 0) return RANK_COLORS.gold;
  if (index === 1) return RANK_COLORS.silver;
  if (index === 2) return RANK_COLORS.bronze;
  return undefined;
}

// Inline SVG icons
function TrendingUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function DropletsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function TableView({ markets, onSelect }: TableViewProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('TableView must be used within FunctionSpaceProvider');

  const [sortKey, setSortKey] = useState<SortKey>('default');

  const sorted = useMemo(() => {
    const copy = [...markets];
    if (sortKey === 'default') return copy.slice(0, ROW_LIMIT);

    copy.sort((a, b) => {
      if (sortKey === 'expiresAt') {
        const aTime = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bTime = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return aTime - bTime;
      }
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return copy.slice(0, ROW_LIMIT);
  }, [markets, sortKey]);

  const showRank = sortKey !== 'default';

  return (
    <div className="fs-table-view">
      {/* Sort bar */}
      <div className="fs-table-view-sort-bar">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`fs-table-view-sort-btn${sortKey === opt.key ? ' active' : ''}`}
            onClick={() => setSortKey(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className={`fs-table-view-header${showRank ? ' with-rank' : ''}`}>
        {showRank && <span className="fs-table-view-col-rank">#</span>}
        <span className="fs-table-view-col-name">Market</span>
        <span className="fs-table-view-col-consensus">Consensus</span>
        <span className="fs-table-view-col-stats">Volume</span>
        <span className="fs-table-view-col-stats">Liquidity</span>
        <span className="fs-table-view-col-action" />
      </div>

      {/* Rows */}
      {sorted.map((market, index) => {
        const status = getStatusConfig(market.resolutionState);
        const rankColor = showRank ? getRankColor(index) : undefined;

        return (
          <div
            key={market.marketId}
            className={`fs-table-view-row${showRank ? ' with-rank' : ''}`}
            role="button"
            aria-label={market.title}
            tabIndex={0}
            onClick={() => onSelect?.(market.marketId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                onSelect?.(market.marketId);
              }
            }}
          >
            {showRank && (
              <span
                className="fs-table-view-rank"
                style={rankColor ? { color: rankColor } : undefined}
              >
                {index + 1}
              </span>
            )}

            <div className="fs-table-view-name">
              <span className="fs-table-view-title">{market.title}</span>
              <span
                className="fs-table-view-status"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>

            <div className="fs-table-view-consensus">
              <span className="fs-table-view-consensus-value">{formatConsensus(market)}</span>
              <span className="fs-table-view-consensus-units">{market.xAxisUnits}</span>
            </div>

            <div className="fs-table-view-stat-cell">
              <TrendingUpIcon />
              <span>{formatCompactNumber(market.totalVolume)}</span>
            </div>

            <div className="fs-table-view-stat-cell">
              <DropletsIcon />
              <span>{formatCompactNumber(market.poolBalance)}</span>
            </div>

            <span className="fs-table-view-trade-btn" aria-hidden="true">
              Trade
            </span>
          </div>
        );
      })}
    </div>
  );
}
