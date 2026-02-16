export type ChartView = 'consensus' | 'distribution' | 'timeline';

export interface OverlayCurve {
  id: string;
  label: string;
  curve: Array<{ x: number; y: number }>;
  color?: string;
}
