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
                return new BurstRenderer({ options, color, rect });
            case 'scribble':
                return new ScribbleRenderer({ options, color, rect });
            case 'sketchout':
                return new SketchoutRenderer({ options, color, rect });
            case 'circle':
                return new CircleRenderer({ options, color, rect });
            default:
                throw new Error(`Unsupported drawing mode: ${mode}`);
        }
    }
}

export default RendererFactory;