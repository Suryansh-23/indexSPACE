import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { projectSell, sell } from '@functionspace/core';
import type { Position, SellResult } from '@functionspace/core';
import { FunctionSpaceContext, usePositions } from '@functionspace/react';
import '../styles/base.css';

export interface PositionTableProps {
  marketId: string | number;
  username: string;
  onSell?: (result: SellResult) => void;
  pageSize?: number;
  selectedPositionId?: number | null;
  onSelectPosition?: (id: number | null) => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function PositionTable({
  marketId,
  username,
  onSell,
  pageSize = 3,
  selectedPositionId,
  onSelectPosition,
}: PositionTableProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('PositionTable must be used within FunctionSpaceProvider');

  const { positions, loading, error, refetch } = usePositions(marketId, username);
  const [marketValues, setMarketValues] = useState<Record<string, number | null>>({});
  const [sellInProgress, setSellInProgress] = useState<Set<string | number>>(new Set());
  const [sellError, setSellError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort positions by ID descending (newest first)
  const sortedPositions = useMemo(() => {
    if (!positions) return [];
    return [...positions].sort((a, b) => {
      const aNum = typeof a.positionId === 'string' ? parseInt(a.positionId.match(/\d+$/)?.[0] || '0') : a.positionId;
      const bNum = typeof b.positionId === 'string' ? parseInt(b.positionId.match(/\d+$/)?.[0] || '0') : b.positionId;
      return bNum - aNum;
    });
  }, [positions]);

  // Pagination
  const totalPages = Math.ceil(sortedPositions.length / pageSize);
  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPositions.slice(start, start + pageSize);
  }, [sortedPositions, currentPage, pageSize]);

  // Reset to page 1 when positions change
  useEffect(() => {
    setCurrentPage(1);
  }, [positions?.length]);

  // Fetch market values for visible open positions
  const refreshMarketValues = useCallback(async (visiblePositions: Position[]) => {
    const openPositions = visiblePositions.filter((p) => p.status === 'open');
    if (openPositions.length === 0) return;

    const results = await Promise.allSettled(
      openPositions.map((p) =>
        projectSell(ctx.client, p.positionId as number, marketId).then((r) => ({
          positionId: p.positionId,
          value: r.collateralReturned,
        }))
      )
    );

    const newValues: Record<string, number | null> = {};
    results.forEach((result, index) => {
      const positionId = openPositions[index].positionId;
      if (result.status === 'fulfilled') {
        newValues[String(positionId)] = result.value.value;
      } else {
        newValues[String(positionId)] = null;
      }
    });

    setMarketValues((prev) => ({ ...prev, ...newValues }));
  }, [ctx.client, marketId]);

  // Refresh market values when page changes
  useEffect(() => {
    if (paginatedPositions.length > 0) {
      refreshMarketValues(paginatedPositions);
    }
  }, [paginatedPositions, refreshMarketValues]);

  const handleSell = async (positionId: number | string) => {
    setSellInProgress((prev) => new Set(prev).add(positionId));
    setSellError(null);

    try {
      const result = await sell(ctx.client, positionId as number, marketId);
      onSell?.(result);
      ctx.invalidate(marketId);
      await refetch();
    } catch (err: any) {
      setSellError(err?.message || 'Failed to sell position');
    } finally {
      setSellInProgress((prev) => {
        const copy = new Set(prev);
        copy.delete(positionId);
        return copy;
      });
    }
  };

  const getMarketValue = (p: Position): number | null => {
    if (p.status !== 'open') return null;
    return marketValues[String(p.positionId)] ?? null;
  };

  const getProfitLoss = (p: Position): number | null => {
    const cost = p.collateral;
    let realized: number | null = null;

    if (p.status === 'sold' && p.soldPrice !== null) {
      realized = p.soldPrice;
    } else if (p.settlementPayout !== null) {
      realized = p.settlementPayout;
    } else {
      realized = getMarketValue(p);
    }

    return realized === null ? null : realized - cost;
  };

  if (loading) {
    return (
      <div className="fs-table-container">
        <div className="fs-table-loading">
          <div className="fs-spinner" />
          <p>Loading positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fs-table-container">
        <div className="fs-table-error">
          <p>{error.message}</p>
          <button className="fs-retry-btn" onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="fs-table-container">
        <div className="fs-table-empty">
          <p>No positions yet</p>
          <p className="fs-table-empty-hint">Submit your first trade to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-table-container">
      <div className="fs-table-header">
        <h3>Your Positions</h3>
        <span className="fs-table-count">{sortedPositions.length} total</span>
      </div>

      {sellError && (
        <div className="fs-table-sell-error">{sellError}</div>
      )}

      <div className="fs-table-wrapper">
        <table className="fs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Prediction</th>
              <th>Cost</th>
              <th>Market Value</th>
              <th>P/L</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPositions.map((p) => {
              const marketValue = getMarketValue(p);
              const profitLoss = getProfitLoss(p);
              const isOpen = p.status === 'open';
              const isSelling = sellInProgress.has(p.positionId);

              // Default to context, allow override via props
              const effectiveSelectedId = selectedPositionId ?? ctx.selectedPosition?.positionId ?? null;
              const isSelected = effectiveSelectedId === p.positionId;

              const handleRowClick = () => {
                const newSelection = isSelected ? null : p;
                if (onSelectPosition) {
                  // Consumer provided custom handler
                  onSelectPosition(isSelected ? null : p.positionId);
                } else {
                  // Default: update context for automatic component coordination
                  ctx.setSelectedPosition(newSelection);
                }
              };

              return (
                <tr
                  key={String(p.positionId)}
                  className={isSelected ? 'fs-row-selected' : ''}
                  onClick={handleRowClick}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="fs-table-id">{String(p.positionId)}</td>
                  <td>
                    <span className={`fs-status-badge ${isOpen ? 'open' : 'closed'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.prediction?.toFixed(2) ?? '—'}</td>
                  <td>{formatCurrency(p.collateral)}</td>
                  <td>{marketValue !== null ? formatCurrency(marketValue) : '—'}</td>
                  <td>
                    {profitLoss !== null ? (
                      <span className={`fs-pl ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
                        {profitLoss >= 0 ? '+' : ''}
                        {formatCurrency(profitLoss)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {isOpen && !isSelling && (
                      <button
                        className="fs-sell-btn"
                        onClick={() => handleSell(p.positionId)}
                      >
                        Sell
                      </button>
                    )}
                    {isOpen && isSelling && (
                      <span className="fs-selling">Selling...</span>
                    )}
                    {!isOpen && <span className="fs-no-action">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="fs-table-pagination">
          <button
            className="fs-page-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          <span className="fs-page-info">
            {currentPage} / {totalPages}
          </span>
          <button
            className="fs-page-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
