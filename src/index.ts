// Export the main MarkerHighlighter class
export { MarkerHighlighter } from './MarkerHighlighter';
//export { Mark } from './Mark';

// Export other necessary classes and utilities
export { RectModel } from './RectModel';
export { Color } from './Color';
export { Utilities } from './Utilities';

// Export renderers if they need to be used directly
export { default as HighlightRenderer } from './renderers/HighlightRenderer';
export { default as ScribbleRenderer } from './renderers/ScribbleRenderer';
export { default as CircleRenderer } from './renderers/CircleRenderer';
//export { default as OldCircleRenderer } from './renderers/OldCircleRenderer';
export { default as SketchoutRenderer } from './renderers/SketchoutRenderer';
export { default as RendererFactory } from './renderers/RendererFactory';

// Export types if needed
export type { HighlighterOptions, ValidationRule } from './Options';