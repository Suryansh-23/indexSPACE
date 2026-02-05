import React from 'react';
import { useMarket } from '@functionspace/react';
import '../styles/base.css';

export interface MarketStatsProps {
  marketId: string | number;
}

export function MarketStats({ marketId }: MarketStatsProps) {
  const { market, loading, error } = useMarket(marketId);

  const statItems = [
    {
      label: 'TOTAL VOLUME',
      value: market
        ? `$${market.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : '$0',
    },
    {
      label: 'CURRENT LIQUIDITY',
      value: market
        ? `$${market.poolBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : '$0',
    },
    {
      label: 'OPEN POSITIONS',
      value: market ? String(market.positionsOpen) : '0',
    },
    {
      label: 'MARKET STATUS',
      value: market ? (market.resolutionState === 'open' ? 'Active' : 'Resolved') : 'Active',
      className: market?.resolutionState === 'open' ? 'status-active' : 'status-resolved',
    },
  ];

  return (
    <div className="fs-stats-bar">
      <div className="fs-stats-inner">
        {statItems.map((stat, i) => (
          <div key={i} className="fs-stat-item">
            <p className="fs-stat-label">{stat.label}</p>
            <p className={`fs-stat-value ${stat.className || ''}`}>
              {loading ? (
                <span className="fs-skeleton" />
              ) : error ? (
                <span style={{ color: 'var(--fs-negative)', fontSize: '0.75rem' }}>Error</span>
              ) : (
                stat.value
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
