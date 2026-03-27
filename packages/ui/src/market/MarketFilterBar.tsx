import React, { useContext, useId, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketFilterBarProps, SortOption } from '@functionspace/react';
import '../styles/base.css';

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MarketFilterBar(props: MarketFilterBarProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MarketFilterBar must be used within FunctionSpaceProvider');

  const sortSelectId = useId();

  const {
    searchText,
    onSearchChange,
    onSearchClear,
    searchPlaceholder,
    availableCategories,
    selectedCategories,
    onToggleCategory,
    onClearCategories,
    featuredCategories,
    sortOptions,
    activeSortField,
    sortOrder,
    onSortFieldChange,
    onSortOrderToggle,
    resultCount,
    loading,
    onReset,
    maxWidth,
  } = props;

  const [visibleRows, setVisibleRows] = useState(1);

  // Order categories: featured first (if provided), then the rest; selected promoted to front
  const orderedCategories = useMemo(() => {
    const featured = featuredCategories
      ? [
          ...featuredCategories.filter(c => availableCategories.includes(c)),
          ...availableCategories.filter(c => !featuredCategories.includes(c)),
        ]
      : availableCategories;

    const selected = featured.filter(c => selectedCategories.includes(c));
    const unselected = featured.filter(c => !selectedCategories.includes(c));
    return [...selected, ...unselected];
  }, [availableCategories, selectedCategories, featuredCategories]);

  // ResizeObserver measurement
  const chipContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef({ rowHeight: 0, totalRows: 1 });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const container = chipContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const prevTotal = measureRef.current.totalRows;

      // Temporarily remove max-height to measure full content
      const prevMaxHeight = container.style.maxHeight;
      container.style.maxHeight = 'none';

      const scrollHeight = container.scrollHeight;
      const firstChip = container.firstElementChild as HTMLElement | null;
      const rowHeight = firstChip ? firstChip.offsetHeight + 8 : 0; // 8px = 0.5rem gap
      const totalRows = rowHeight > 0 ? Math.ceil(scrollHeight / rowHeight) : 1;

      // Restore max-height
      container.style.maxHeight = prevMaxHeight;

      measureRef.current = { rowHeight, totalRows };

      if (totalRows !== prevTotal) {
        forceUpdate(c => c + 1);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { rowHeight, totalRows } = measureRef.current;
  const hasOverflow = totalRows > visibleRows;
  const maxHeight = rowHeight > 0 ? visibleRows * rowHeight : undefined;

  const handleMoreLess = useCallback(() => {
    const { totalRows: total } = measureRef.current;
    setVisibleRows(v => v < total ? v + 1 : 1);
  }, []);

  const rootClassName = `fs-market-filter-bar${loading ? ' fs-market-filter-loading' : ''}`;

  return (
    <div className={rootClassName} style={{ maxWidth: maxWidth || '100%' }}>
      {/* Row 1: Search input */}
      <div className="fs-market-filter-search">
        <svg
          className="fs-market-filter-search-icon"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="fs-market-filter-search-input"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder || 'Search markets...'}
        />
        {searchText && (
          <button
            className="fs-market-filter-search-clear"
            onClick={onSearchClear}
            aria-label="Clear search"
          >
            {'\u00D7'}
          </button>
        )}
      </div>

      {/* Row 2: Category chips + More */}
      <div className="fs-market-filter-categories-row">
        <div className="fs-market-filter-categories" ref={chipContainerRef} style={maxHeight ? { maxHeight } : undefined}>
          <button
            className={`fs-market-filter-chip${selectedCategories.length === 0 ? ' fs-market-filter-chip-active' : ''}`}
            aria-pressed={selectedCategories.length === 0}
            onClick={onClearCategories ?? onReset}
          >
            All
          </button>
          {orderedCategories.map((category) => (
            <button
              key={category}
              className={`fs-market-filter-chip${selectedCategories.includes(category) ? ' fs-market-filter-chip-active' : ''}`}
              aria-pressed={selectedCategories.includes(category)}
              onClick={() => onToggleCategory(category)}
            >
              {capitalize(category)}
            </button>
          ))}
        </div>
        {(hasOverflow || visibleRows > 1) && (
          <button className="fs-market-filter-chip fs-market-filter-chip-more" onClick={handleMoreLess}>
            {hasOverflow ? `+${totalRows - visibleRows} More` : 'Less'}
          </button>
        )}
      </div>

      {/* Row 3: Result count + Sort */}
      <div className="fs-market-filter-info">
        <span className="fs-market-filter-count">
          {resultCount} {resultCount === 1 ? 'market' : 'markets'}
        </span>
        <div className="fs-market-filter-sort">
          <label className="fs-market-filter-sort-label" htmlFor={sortSelectId}>Sort:</label>
          <select
            id={sortSelectId}
            value={activeSortField}
            onChange={(e) => onSortFieldChange(e.target.value)}
          >
            {sortOptions.map((opt: SortOption) => (
              <option key={opt.field} value={opt.field}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="fs-market-filter-sort-order"
            onClick={onSortOrderToggle}
            aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortOrder === 'asc' ? '\u2191' : '\u2193'}
          </button>
        </div>
      </div>
    </div>
  );
}
