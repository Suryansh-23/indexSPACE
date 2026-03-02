/**
 * Convenience factory for Recharts plot area calculation.
 * Returns a getPlotArea function compatible with useChartZoom.
 */
export function rechartsPlotArea(
  margin: { left: number; right: number },
  yAxisWidth: number = 60,
) {
  return (rect: DOMRect) => ({
    left: rect.left + margin.left + yAxisWidth,
    right: rect.right - margin.right,
  });
}
