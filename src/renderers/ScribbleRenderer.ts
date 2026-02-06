import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

interface ScribbleLine {
    points: { x: number; y: number }[];
    color: string;
}

export default class ScribbleRenderer extends Renderer {
    private readonly TOTAL_POINTS = 100;
    private padding: number;
    private lines: ScribbleLine[] = [];
    private lineWidth: number;
    private lineCount: number = 3;

    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed || 1000;

        const rect = this.rect.rect;
        this.padding = rect.height * 0.5;
        this.lineWidth = rect.height * 0.1;

        this.canvas = this.createCanvas(this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.generateLines();
    }

    private generateLines(): void {
        const rect = this.rect.rect;
        const lineSpacing = this.lineWidth * 1.5;
        const maxAmplitude = rect.height * 0.3;

        const lineStartColor = this.color.copy().lighten(10);
        const lineEndColor = this.color;

        for (let line = 0; line < this.lineCount; line++) {
            const baseY = (this.canvas.height / 2) + (line - 1) * lineSpacing;
            const points: { x: number; y: number }[] = [];

            for (let i = 0; i <= this.TOTAL_POINTS; i++) {
                const progress = i / this.TOTAL_POINTS;
                const x = this.padding + progress * rect.width;
                const deviation = (Math.sin(progress * Math.PI * 4 + line) * 0.5 + (Math.random() - 0.5) * 0.5) * maxAmplitude;
                const y = baseY + deviation;
                points.push({ x, y });
            }

            // Interpolate color based on line position
            const colorProgress = line / (this.lineCount - 1);
            const color = colorProgress < 0.5 ? lineStartColor.copy() : lineEndColor.copy();

            this.lines.push({ points, color: this.color.rgb });
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
        const startIndex = Math.floor(fromProgress * this.TOTAL_POINTS);
        const endIndex = Math.min(Math.ceil(toProgress * this.TOTAL_POINTS), this.TOTAL_POINTS);

        this.ctx.lineWidth = this.lineWidth;

        for (const line of this.lines) {
            this.ctx.strokeStyle = line.color;
            this.ctx.beginPath();

            for (let i = startIndex; i <= endIndex; i++) {
                const point = line.points[i];
                if (i === startIndex) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            }

            this.ctx.stroke();
        }
    }
}
