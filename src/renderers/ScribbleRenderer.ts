import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

export default class ScribbleRenderer extends Renderer {
    
    constructor(options: RendererOptions) {
        super(options);
    }

    draw(): DrawResult {
        const rect = this.rect.rect;
        const padding = rect.height * 0.5; // Extra space for the scribble effect

        const canvas = this.createCanvas(padding);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

        const lineWidth = rect.height * 0.1; // Chunky line width
        const lineCount = 3; // Number of lines
        const lineSpacing = lineWidth * 1.5; // Spacing between lines
        const scribbleFrequency = 10; // Number of curves per unit width
        const maxScribbleAmplitude = rect.height * 2; // Maximum height of the scribble effect

        const lineStartColor = this.color.copy().lighten(10); // Lighter color
        const lineEndColor = this.color; // Original color

        for (let line = 0; line < lineCount; line++) {
            const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
            gradient.addColorStop(0, lineStartColor.rgb);
            gradient.addColorStop(1, lineEndColor.rgb);
            ctx.strokeStyle = gradient;

            ctx.lineWidth = lineWidth;
            ctx.beginPath();

            let lastY = (rect.height / 2) + line * lineSpacing;

            for (let x = padding; x <= rect.width; x += rect.width / scribbleFrequency) {
                const deviation = (Math.random() - 0.5) * maxScribbleAmplitude;
                const y = (rect.height / 2) + deviation;

                const midX = x + (rect.width / scribbleFrequency) / 2;
                const midY = (lastY + y) / 2;

                ctx.quadraticCurveTo(midX, midY, x, y);
                lastY = y;
            }

            ctx.stroke();
        }

        return {
            canvas: canvas,
            height: rect.height + 2 * padding,
            verticalOffset: padding,
            horizontalPadding: padding
        };
    }
}
