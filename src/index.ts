// Export the main MarkerHighlighter class (DOM-based highlighting)
export { MarkerHighlighter } from './MarkerHighlighter';

// Export the pretext-powered highlighter (arithmetic layout, no DOM reflow)
export { PretextHighlighter } from './PretextHighlighter';
export type { PretextHighlighterOptions, PretextMark, PretextObstacle, PretextMetrics } from './PretextHighlighter';

// Export other necessary classes and utilities
export { RectModel } from './RectModel';
export { Color } from './Color';
export { Utilities } from './Utilities';

// Export renderers if they need to be used directly
export { default as HighlightRenderer } from './renderers/HighlightRenderer';
export { default as ScribbleRenderer } from './renderers/ScribbleRenderer';
export { default as CircleRenderer } from './renderers/CircleRenderer';
export { default as SketchoutRenderer } from './renderers/SketchoutRenderer';
export { default as RendererFactory } from './renderers/RendererFactory';

// Export types if needed
export type { HighlighterOptions, ValidationRule } from './Options';