import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  pixelToDataX,
  computeZoomedDomain,
  computePannedDomain,
  filterVisibleData,
} from '@functionspace/core';

export interface ChartZoomOptions {
  data: any[];
  xKey: string;
  fullXDomain: [number, number];
  getPlotArea: (containerRect: DOMRect) => { left: number; right: number };
  computeYDomain?: (visibleData: any[], fullData: any[]) => [number, number];
  resetTrigger?: any;
  maxZoomFactor?: number;
  zoomFactor?: number;
  panExcludeSelectors?: string[];
  enabled?: boolean;
}

export interface ChartZoomResult {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  xDomain: [number, number];
  yDomain: [number, number] | undefined;
  isZoomed: boolean;
  isPanning: boolean;
  containerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onDoubleClick: () => void;
    style: React.CSSProperties;
  };
  reset: () => void;
}

// No-op handler for disabled mode
const noop = () => {};
const noopMouse = (_e: React.MouseEvent) => {};

export function useChartZoom(options: ChartZoomOptions): ChartZoomResult {
  const {
    data,
    xKey,
    fullXDomain,
    getPlotArea,
    computeYDomain,
    resetTrigger,
    maxZoomFactor = 50,
    zoomFactor = 0.15,
    panExcludeSelectors,
    enabled = true,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);

  // null = unzoomed (showing full domain)
  const [xDomainState, setXDomainState] = useState<[number, number] | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Refs for rAF coalescing and stale closure avoidance
  const pendingDomainRef = useRef<[number, number] | null>(null);
  const rafRef = useRef<number | null>(null);
  const xDomainRef = useRef<[number, number] | null>(null);
  const panStartRef = useRef<{
    clientX: number;
    domainAtStart: [number, number];
  } | null>(null);

  // Keep xDomainRef in sync with state
  xDomainRef.current = xDomainState;

  // Reset when resetTrigger changes  -- cancel any pending rAF first
  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingDomainRef.current = null;
    setXDomainState(null);
    setIsPanning(false);
    panStartRef.current = null;
  }, [resetTrigger]);

  // Imperative wheel listener (requires { passive: false } for preventDefault)
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const plotArea = getPlotArea(rect);
      const cur = xDomainRef.current ?? fullXDomain;
      const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const cursorDataX = pixelToDataX(e.clientX, plotArea.left, plotArea.right, cur);

      const newDomain = computeZoomedDomain({
        currentDomain: cur,
        fullDomain: fullXDomain,
        cursorDataX,
        direction,
        zoomFactor,
        maxZoomFactor,
      });

      // rAF coalescing: write latest, schedule one frame
      pendingDomainRef.current = newDomain;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setXDomainState(pendingDomainRef.current);
          rafRef.current = null;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, fullXDomain, getPlotArea, zoomFactor, maxZoomFactor]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Reset zoom when fullXDomain changes value (data reload, market switch)
  const prevFullXDomainRef = useRef<[number, number]>(fullXDomain);
  useEffect(() => {
    const [prevMin, prevMax] = prevFullXDomainRef.current;
    const [newMin, newMax] = fullXDomain;
    if (prevMin !== newMin || prevMax !== newMax) {
      prevFullXDomainRef.current = fullXDomain;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingDomainRef.current = null;
      setXDomainState(null);
      setIsPanning(false);
      panStartRef.current = null;
    }
  }, [fullXDomain]);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      if (xDomainRef.current === null) return; // not zoomed  -- no pan
      if (e.button !== 0) return; // left button only

      // Check pan exclusion selectors
      if (panExcludeSelectors) {
        const target = e.target as Element;
        for (const sel of panExcludeSelectors) {
          if (target.closest(sel)) return;
        }
      }

      setIsPanning(true);
      panStartRef.current = {
        clientX: e.clientX,
        domainAtStart: [...xDomainRef.current],
      };
    },
    [enabled, panExcludeSelectors],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panStartRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const plotArea = getPlotArea(rect);
      const plotWidth = plotArea.right - plotArea.left;
      const pixelDelta = e.clientX - panStartRef.current.clientX;

      const newDomain = computePannedDomain({
        startDomain: panStartRef.current.domainAtStart,
        fullDomain: fullXDomain,
        pixelDelta,
        plotAreaWidth: plotWidth,
      });

      setXDomainState(newDomain);
    },
    [fullXDomain, getPlotArea],
  );

  const stopPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!enabled) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingDomainRef.current = null;
    setXDomainState(null);
    setIsPanning(false);
    panStartRef.current = null;
  }, [enabled]);

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingDomainRef.current = null;
    setXDomainState(null);
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // Effective X domain
  const isZoomed = xDomainState !== null;
  const xDomain = xDomainState ?? fullXDomain;

  // Y domain computation
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (!computeYDomain || !data || data.length === 0) return undefined;
    if (!isZoomed) return computeYDomain(data, data);

    const visible = filterVisibleData(data, xKey as keyof (typeof data)[0] & string, xDomain);
    if (visible.length > 0) return computeYDomain(visible, data);
    return computeYDomain(data, data); // fallback to full data
  }, [computeYDomain, data, xKey, xDomain, isZoomed]);

  // Container style
  const style = useMemo<React.CSSProperties>(() => {
    if (!enabled) return {};
    if (isPanning) {
      return { cursor: 'grabbing', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties;
    }
    if (isZoomed) {
      return { cursor: 'grab' };
    }
    return {};
  }, [enabled, isPanning, isZoomed]);

  // Build containerProps
  const containerProps = useMemo(
    () =>
      enabled
        ? {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: stopPan,
            onMouseLeave: stopPan,
            onDoubleClick: handleDoubleClick,
            style,
          }
        : {
            onMouseDown: noopMouse,
            onMouseMove: noopMouse,
            onMouseUp: noop,
            onMouseLeave: noop,
            onDoubleClick: noop,
            style: {} as React.CSSProperties,
          },
    [enabled, handleMouseDown, handleMouseMove, stopPan, handleDoubleClick, style],
  );

  return {
    containerRef,
    xDomain,
    yDomain,
    isZoomed,
    isPanning,
    containerProps,
    reset,
  };
}
