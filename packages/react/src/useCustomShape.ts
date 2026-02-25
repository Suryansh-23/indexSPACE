import { useState, useCallback, useContext, useMemo } from 'react';
import { buildCustomShape, generateBellShape, computeStatistics } from '@functionspace/core';
import type { BeliefVector, MarketState } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

// State management hook for custom shape editing.
// The consuming widget manages loading and error states from useMarket separately.
// This hook provides pure state + actions for control point manipulation.

const MIN_POINTS = 5;
const MAX_POINTS = 25;
const DEFAULT_POINTS = 20;
const MAX_LOCKS = 2;
const CONTROL_VALUE_MIN = 0;
const CONTROL_VALUE_MAX = 25;

export interface UseCustomShapeReturn {
  controlValues: number[];
  lockedPoints: number[];
  numPoints: number;
  pVector: BeliefVector | null;
  prediction: number | null;

  setControlValue: (index: number, value: number) => void;
  toggleLock: (index: number) => void;
  setNumPoints: (n: number) => void;
  resetToDefault: () => void;

  startDrag: (index: number) => void;
  handleDrag: (value: number) => void;
  endDrag: () => void;
  isDragging: boolean;
  draggingIndex: number | null;
}

export function useCustomShape(market: MarketState | null): UseCustomShapeReturn {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useCustomShape must be used within FunctionSpaceProvider');

  const [numPoints, setNumPointsRaw] = useState(DEFAULT_POINTS);
  const [controlValues, setControlValues] = useState<number[]>(() =>
    generateBellShape(DEFAULT_POINTS),
  );
  const [lockedPoints, setLockedPoints] = useState<number[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const pVector = useMemo<BeliefVector | null>(() => {
    if (!market) return null;
    const { K, L, H } = market.config;
    return buildCustomShape(controlValues, K, L, H);
  }, [controlValues, market]);

  const prediction = useMemo<number | null>(() => {
    if (!pVector || !market) return null;
    const { L, H } = market.config;
    const stats = computeStatistics(pVector, L, H);
    return stats.mode;
  }, [pVector, market]);

  const setControlValue = useCallback((index: number, value: number) => {
    if (lockedPoints.includes(index)) return;
    const clamped = Math.max(CONTROL_VALUE_MIN, Math.min(CONTROL_VALUE_MAX, value));
    setControlValues(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = clamped;
      return next;
    });
  }, [lockedPoints]);

  const toggleLock = useCallback((index: number) => {
    setLockedPoints(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= MAX_LOCKS) {
        return [...prev.slice(1), index];
      }
      return [...prev, index];
    });
  }, []);

  const setNumPoints = useCallback((n: number) => {
    const clamped = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(n)));
    setNumPointsRaw(clamped);
    setControlValues(generateBellShape(clamped));
    setLockedPoints([]);
  }, []);

  const resetToDefault = useCallback(() => {
    setControlValues(generateBellShape(numPoints));
    setLockedPoints([]);
    setDraggingIndex(null);
  }, [numPoints]);

  const startDrag = useCallback((index: number) => {
    if (lockedPoints.includes(index)) return;
    setDraggingIndex(index);
  }, [lockedPoints]);

  const handleDrag = useCallback((value: number) => {
    if (draggingIndex === null) return;
    if (lockedPoints.includes(draggingIndex)) return;
    const clamped = Math.max(CONTROL_VALUE_MIN, Math.min(CONTROL_VALUE_MAX, value));
    setControlValues(prev => {
      const next = [...prev];
      next[draggingIndex] = clamped;
      return next;
    });
  }, [draggingIndex, lockedPoints]);

  const endDrag = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  return {
    controlValues,
    lockedPoints,
    numPoints,
    pVector,
    prediction,
    setControlValue,
    toggleLock,
    setNumPoints,
    resetToDefault,
    startDrag,
    handleDrag,
    endDrag,
    isDragging: draggingIndex !== null,
    draggingIndex,
  };
}
