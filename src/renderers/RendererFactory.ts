import HighlightRenderer from './HighlightRenderer';
import ScribbleRenderer from './ScribbleRenderer';
import SketchoutRenderer from './SketchoutRenderer';
import CircleRenderer from './CircleRenderer';
import BurstRenderer from './BurstRenderer';

// Import other Renderers as needed

interface RendererOptions {
    mode: string;
    options: any;
    color: any;
    rect: any;
}

class RendererFactory {
    static getRenderer({ mode, options, color, rect }: RendererOptions) {
        switch (mode) {
            case 'highlight':                
                return new HighlightRenderer({ options, color, rect });
            case 'burst':
                //throw new Error(`Burst not yet implemented`);
                return new BurstRenderer({ options, color, rect });                
            case 'scribble':
                throw new Error(`Scribble not yet implemented`);
                return new ScribbleRenderer({ options, color, rect });
            case 'sketchout':
                throw new Error(`Sketchout not yet implemented`);
                return new SketchoutRenderer({ options, color, rect });
            case 'circle':
                //throw new Error(`Circle not yet implemented`);
                return new CircleRenderer({ options, color, rect });
            default:
                throw new Error(`Unsupported drawing mode: ${mode}`);
        }
    }
}

export default RendererFactory;