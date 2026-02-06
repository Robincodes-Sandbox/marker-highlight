import { Renderer, RendererOptions, DrawResult } from './Renderer';
import { Color } from '../Color';
import { Utilities } from '../Utilities';

interface Point {
    x: number;
    y: number;
}

export default class CircleRenderer extends Renderer {
    private controlPoints: Point[] = [];
    private totalPoints: number = 1000;
    private padding: number;
    private centerOffset: Point = { x: 0, y: 0 };
    private radiusOffset: number = 0;

    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed || 1000;
        
        const rect = this.rect.rect;
        this.padding = Math.max(rect.height, rect.width) * 0.25;
        this.canvas = this.createCanvas(this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        
        this.generateControlPoints();
    }

    private generateControlPoints() {
        const rect = this.rect.rect;
        const { curve } = this.options.circle;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radiusX = (rect.width / 2 + this.options.padding * rect.height) * 0.9;
        const radiusY = (rect.height / 2 * this.options.height) * 0.9;

        const points = 64;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const curveEffect = Math.pow(Math.sin(angle), 2) * curve + (1 - curve);
            
            let x = centerX + radiusX * Math.cos(angle) * curveEffect;
            let y = centerY + radiusY * Math.sin(angle) * curveEffect;
            
            this.controlPoints.push({ x, y });
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
        //this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { loops, thickness, wobble } = this.options.circle;
        const totalLength = this.totalPoints * loops;
        const startPoint = Math.floor(fromProgress * totalLength);
        const endPoint = Math.floor(toProgress * totalLength);

        this.ctx.beginPath();

        for (let i = startPoint; i <= endPoint; i++) {
            const t = (i % this.totalPoints) / this.totalPoints;
            const loopProgress = i / totalLength;
            
            this.updateCenterAndRadius(loopProgress);
            const basePoint = this.getPointOnPath(t);
            const wobbleOffset = this.getWobbleOffset(t, wobble, loopProgress);
            const point = {
                x: basePoint.x + wobbleOffset.x + this.centerOffset.x,
                y: basePoint.y + wobbleOffset.y + this.centerOffset.y
            };
            
            const thicknessFactor = this.getThicknessFactor(loopProgress);
            this.ctx.lineWidth = thickness * thicknessFactor;

            const color = this.getColorAtProgress(loopProgress);
            this.ctx.strokeStyle = color.rgb;

            if (i === startPoint) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }

            // Stroke each segment individually for color variation
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
        }
    }

    private updateCenterAndRadius(progress: number) {
        const maxOffset = this.padding * 0.1;
        const targetCenterX = (Math.random() - 0.5) * maxOffset;
        const targetCenterY = (Math.random() - 0.5) * maxOffset;
        const targetRadiusOffset = (Math.random() - 0.5) * maxOffset;

        const smoothingFactor = 0.05;
        this.centerOffset.x += (targetCenterX - this.centerOffset.x) * smoothingFactor;
        this.centerOffset.y += (targetCenterY - this.centerOffset.y) * smoothingFactor;
        this.radiusOffset += (targetRadiusOffset - this.radiusOffset) * smoothingFactor;
    }

    private getPointOnPath(t: number): Point {
        const index = t * this.controlPoints.length;
        const i = Math.floor(index);
        const nextI = (i + 1) % this.controlPoints.length;
        const frac = index - i;

        const p0 = this.controlPoints[i];
        const p1 = this.controlPoints[nextI];

        return {
            x: p0.x + (p1.x - p0.x) * frac + this.radiusOffset,
            y: p0.y + (p1.y - p0.y) * frac + this.radiusOffset
        };
    }

    private getWobbleOffset(t: number, wobble: number, loopProgress: number): Point {
        const baseFrequency = 2;
        const frequencyIncrease = 4;
        const frequency = baseFrequency + loopProgress * frequencyIncrease;
        
        const baseAmplitude = wobble * 0.5;
        const amplitudeIncrease = wobble * 1.5;
        const amplitude = baseAmplitude + loopProgress * amplitudeIncrease;
        
        const xOffset = Math.sin(t * Math.PI * 2 * frequency) * amplitude;
        const yOffset = Math.cos((t + 0.25) * Math.PI * 2 * frequency) * amplitude;
        
        return { x: xOffset, y: yOffset };
    }

    private getThicknessFactor(progress: number): number {
        const p0 = 0.2;
        const p1 = 1.2;
        const p2 = 1;
        
        if (progress < 0.45) {
            return Utilities.bezier(progress / 0.5, p0, p0, p1);
        } else {
            return Utilities.bezier((progress - 0.5) / 0.5, p1, p2, p2);
        }
    }

    private getColorAtProgress(progress: number): Color {
        const baseColor = new Color(this.color.rgb);
        const darkenAmount = progress * 30; // Darken up to 30%
        return baseColor.darken(darkenAmount);
    }
}