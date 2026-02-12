import React from 'react';
import RCSlider from 'rc-slider';
import 'rc-slider/assets/index.css';
import '../styles/slider.css';

export interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  disabled?: boolean;
  showTrack?: boolean;
}

export function Slider({ min, max, value, onChange, step, disabled, showTrack = true }: SliderProps) {
  return (
    <RCSlider
      min={min}
      max={max}
      value={value}
      onChange={(v) => onChange(v as number)}
      step={step}
      disabled={disabled}
      styles={!showTrack ? { track: { background: 'transparent' } } : undefined}
    />
  );
}
