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
}

export function Slider({ min, max, value, onChange, step, disabled }: SliderProps) {
  return (
    <RCSlider
      min={min}
      max={max}
      value={value}
      onChange={(v) => onChange(v as number)}
      step={step}
      disabled={disabled}
    />
  );
}
