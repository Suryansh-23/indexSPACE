import React, { useContext, useId, useState } from 'react';
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

  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  // Order categories: featured first (if provided), then the rest
  const orderedCategories = featuredCategories
    ? [
        ...featuredCategories.filter(c => availableCategories.includes(c)),
        ...availableCategories.filter(c => !featuredCategories.includes(c)),
      ]
    : availableCategories;

  // When featured categories are provided and there are more available, show only featured unless expanded
  const hasOverflow = featuredCategories && orderedCategories.length > featuredCategories.length;
  const visibleCategories = hasOverflow && !categoriesExpanded
    ? orderedCategories.slice(0, featuredCategories.length)
    : orderedCategories;

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

      {/* Row 2: Category chips */}
      <div className="fs-market-filter-categories">
        <button
          className={`fs-market-filter-chip${selectedCategories.length === 0 ? ' fs-market-filter-chip-active' : ''}`}
          aria-pressed={selectedCategories.length === 0}
          onClick={onClearCategories ?? onReset}
        >
          All
        </button>
        {visibleCategories.map((category) => (
          <button
            key={category}
            className={`fs-market-filter-chip${selectedCategories.includes(category) ? ' fs-market-filter-chip-active' : ''}`}
            aria-pressed={selectedCategories.includes(category)}
            onClick={() => onToggleCategory(category)}
          >
            {capitalize(category)}
          </button>
        ))}
        {hasOverflow && (
          <button
            className="fs-market-filter-chip fs-market-filter-chip-more"
            onClick={() => setCategoriesExpanded(!categoriesExpanded)}
            aria-expanded={categoriesExpanded}
          >
            {categoriesExpanded ? 'Less' : `+${orderedCategories.length - featuredCategories!.length} More`}
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
