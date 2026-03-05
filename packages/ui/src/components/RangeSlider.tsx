import React from 'react';
import RCSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import '../styles/slider.css';

export interface RangeSliderProps {
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  step?: number;
  disabled?: boolean;
  showTrack?: boolean;
}

export function RangeSlider({ min, max, values, onChange, step, disabled, showTrack = true }: RangeSliderProps) {
  return (
    <div className="fs-slider">
      <RCSlider
        range
        min={min}
        max={max}
        value={values}
        onChange={(v) => onChange(v as [number, number])}
        step={step}
        disabled={disabled}
        styles={!showTrack ? { track: { background: 'transparent' } } : undefined}
      />
    </div>
  );
}
