import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

interface SketchPoint {
    x: number;
    y: number;
}

export default class SketchoutRenderer extends Renderer {
    private readonly POINTS_PER_SIDE = 25;
    private padding: number;
    private pathPoints: SketchPoint[] = [];
    private lineWidth: number = 2;

    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed || 1000;

        const rect = this.rect.rect;
        this.padding = rect.height * 0.3;

        this.canvas = this.createCanvas(this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.generatePath();
    }

    private generatePath(): void {
        const rect = this.rect.rect;
        const wobble = rect.height * 0.05;

        const left = this.padding;
        const right = this.padding + rect.width;
        const top = this.padding;
        const bottom = this.padding + rect.height;

        // Generate points along the rectangle path with slight wobble
        // Top edge (left to right)
        for (let i = 0; i <= this.POINTS_PER_SIDE; i++) {
            const progress = i / this.POINTS_PER_SIDE;
            this.pathPoints.push({
                x: left + progress * rect.width + (Math.random() - 0.5) * wobble,
                y: top + (Math.random() - 0.5) * wobble
            });
        }

        // Right edge (top to bottom)
        for (let i = 1; i <= this.POINTS_PER_SIDE; i++) {
            const progress = i / this.POINTS_PER_SIDE;
            this.pathPoints.push({
                x: right + (Math.random() - 0.5) * wobble,
                y: top + progress * rect.height + (Math.random() - 0.5) * wobble
            });
        }

        // Bottom edge (right to left)
        for (let i = 1; i <= this.POINTS_PER_SIDE; i++) {
            const progress = i / this.POINTS_PER_SIDE;
            this.pathPoints.push({
                x: right - progress * rect.width + (Math.random() - 0.5) * wobble,
                y: bottom + (Math.random() - 0.5) * wobble
            });
        }

        // Left edge (bottom to top)
        for (let i = 1; i < this.POINTS_PER_SIDE; i++) {
            const progress = i / this.POINTS_PER_SIDE;
            this.pathPoints.push({
                x: left + (Math.random() - 0.5) * wobble,
                y: bottom - progress * rect.height + (Math.random() - 0.5) * wobble
            });
        }
    }

    setBounds(): DrawResult {
        const rect = this.rect.rect;
        return {
            canvas: this.canvas,
            height: rect.height + 2 * this.padding,
            verticalOffset: this.padding,
            horizontalPadding: this.padding
        };
    }

    step(fromProgress: number, toProgress: number): void {
        const totalPoints = this.pathPoints.length;
        const startIndex = Math.floor(fromProgress * totalPoints);
        const endIndex = Math.min(Math.ceil(toProgress * totalPoints), totalPoints - 1);

        if (startIndex >= endIndex) return;

        this.ctx.strokeStyle = this.color.rgb;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.beginPath();

        for (let i = startIndex; i <= endIndex; i++) {
            const point = this.pathPoints[i];
            if (i === startIndex) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        }

        this.ctx.stroke();
    }
}
