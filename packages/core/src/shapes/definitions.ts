export type ShapeId =
  | 'gaussian'
  | 'spike'
  | 'range'
  | 'bimodal'
  | 'dip'
  | 'leftskew'
  | 'rightskew'
  | 'uniform';

export interface ShapeDefinition {
  id: ShapeId;
  name: string;
  description: string;
  /** Which parameter controls this shape needs. The widget uses this to show/hide sliders. */
  parameters: ('targetOutcome' | 'confidence' | 'rangeValues' | 'peakBias' | 'skewAmount')[];
  /** SVG path data for the shape icon, viewBox="0 0 100 60" */
  svgPath: string;
}

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  {
    id: 'gaussian',
    name: 'Gaussian',
    description: 'Standard bell curve centered on target outcome',
    parameters: ['targetOutcome', 'confidence'],
    svgPath: 'M 5,55 Q 25,55 35,35 Q 45,10 50,5 Q 55,10 65,35 Q 75,55 95,55',
  },
  {
    id: 'spike',
    name: 'Spike',
    description: 'Very narrow, concentrated peak',
    parameters: ['targetOutcome', 'confidence'],
    svgPath: 'M 5,55 L 45,55 L 50,5 L 55,55 L 95,55',
  },
  {
    id: 'range',
    name: 'Range',
    description: 'Flat-topped distribution with sharp cliff edges at range boundaries',
    parameters: ['rangeValues'],
    svgPath: 'M 5,55 L 30,55 L 35,20 L 65,20 L 70,55 L 95,55',
  },
  {
    id: 'bimodal',
    name: 'Bimodal',
    description: 'Two peaks with adjustable balance',
    parameters: ['rangeValues', 'confidence', 'peakBias'],
    svgPath: 'M 5,55 Q 20,55 25,35 Q 30,15 35,25 Q 40,35 50,45 Q 60,35 65,25 Q 70,15 75,35 Q 80,55 95,55',
  },
  {
    id: 'dip',
    name: 'The Dip',
    description: 'Inverted gaussian  -- high at edges, low at center',
    parameters: ['targetOutcome', 'confidence'],
    svgPath: 'M 5,15 Q 35,15 50,55 Q 65,15 95,15',
  },
  {
    id: 'leftskew',
    name: 'Left Skew',
    description: 'Asymmetric with longer tail on left side',
    parameters: ['targetOutcome', 'confidence', 'skewAmount'],
    svgPath: 'M 5,55 Q 40,55 50,15 Q 55,10 65,30 Q 75,55 95,55',
  },
  {
    id: 'rightskew',
    name: 'Right Skew',
    description: 'Asymmetric with longer tail on right side',
    parameters: ['targetOutcome', 'confidence', 'skewAmount'],
    svgPath: 'M 5,55 Q 25,55 35,30 Q 45,10 50,15 Q 60,55 95,55',
  },
  {
    id: 'uniform',
    name: 'Uniform',
    description: 'Flat distribution across entire range',
    parameters: [],
    svgPath: 'M 10,30 L 90,30',
  },
];
