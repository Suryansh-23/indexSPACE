import React, { useContext } from 'react';
import { FunctionSpaceContext, useTradeHistory } from '@functionspace/react';
import type { TradeEntry } from '@functionspace/core';
import '../styles/base.css';

export interface TimeSalesProps {
  marketId: string | number;
  maxHeight?: string;
  limit?: number;
  pollInterval?: number;
  showFooter?: boolean;
  emptyMessage?: string;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const truncateUsername = (username: string | null | undefined): string => {
  if (!username) return 'Unknown';
  if (username.length <= 12) return username;
  return `${username.slice(0, 8)}...${username.slice(-4)}`;
};

export function TimeSales({
  marketId,
  maxHeight = '500px',
  limit = 100,
  pollInterval = 5000,
  showFooter = true,
  emptyMessage = 'No market activity yet',
}: TimeSalesProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('TimeSales must be used within FunctionSpaceProvider');

  const { trades, loading, error, refetch } = useTradeHistory(marketId, {
    limit,
    pollInterval,
  });

  if (loading && !trades) {
    return (
      <div className="fs-time-sales">
        <div className="fs-table-loading">
          <div className="fs-spinner" />
          <p>Loading trades...</p>
        </div>
      </div>
    );
  }

  if (error && !trades) {
    return (
      <div className="fs-time-sales">
        <div className="fs-table-error">
          <p>{error.message}</p>
          <button className="fs-retry-btn" onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

  const tradeList = trades ?? [];

  return (
    <div className="fs-time-sales">
      <div className="fs-time-sales-header">
        <h3>Time &amp; Sales</h3>
      </div>

      <div className="fs-time-sales-body" style={{ maxHeight }}>
        <table className="fs-table">
          <thead>
            <tr>
              <th>UTC Date/Time</th>
              <th>Prediction</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>User</th>
            </tr>
          </thead>
          <tbody>
            {tradeList.length === 0 ? (
              <tr>
                <td colSpan={4} className="fs-time-sales-empty">
                  <p>{emptyMessage}</p>
                  <p className="fs-time-sales-empty-hint">Trades will appear here</p>
                </td>
              </tr>
            ) : (
              tradeList.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {showFooter && tradeList.length > 0 && (
        <div className="fs-time-sales-footer">
          <span>Recent Trades</span>
          <span className="fs-time-sales-count">{tradeList.length}</span>
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade }: { trade: TradeEntry }) {
  const colorClass = trade.side === 'buy' ? 'fs-trade-buy' : 'fs-trade-sell';

  return (
    <tr className={colorClass}>
      <td className="fs-time-sales-timestamp">{trade.timestamp}</td>
      <td>{trade.prediction !== null ? trade.prediction.toFixed(2) : 'N/A'}</td>
      <td style={{ textAlign: 'right' }}>{formatCurrency(trade.amount)}</td>
      <td style={{ textAlign: 'right' }} className="fs-time-sales-user">
        {truncateUsername(trade.username)}
      </td>
    </tr>
  );
}
