import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

export default class SketchoutRenderer extends Renderer {
    constructor(options: RendererOptions) {
        super(options);
    }

    draw(): DrawResult {
        // Placeholder for the drawing logic
        const rect = this.rect.rect;
        const padding = rect.height * 0.5; // Example padding, can be adjusted

        const canvas = this.createCanvas(padding);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

        // Example drawing logic
        ctx.strokeStyle = this.color.rgb;
        ctx.lineWidth = 2; // Example line width
        ctx.strokeRect(padding, padding, rect.width, rect.height); // Example rect drawing

        return {
            canvas: canvas,
            height: rect.height + 2 * padding,
            verticalOffset: padding,
            horizontalPadding: padding
        };
    }
}