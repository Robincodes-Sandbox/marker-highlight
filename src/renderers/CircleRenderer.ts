import { Renderer, RendererOptions, DrawResult } from './Renderer';
import { Color } from '../Color';
import { Utilities } from '../Utilities';

interface Point {
    x: number;
    y: number;
}

interface PathSegment {
    points: Point[];
    color: string;
    thickness: number;
}

export default class CircleRenderer extends Renderer {
    private controlPoints: Point[] = [];
    private totalPoints: number = 200;
    private padding: number;
    private pathSegments: PathSegment[] = [];

    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed || 1000;

        const rect = this.rect.rect;
        // Increase padding for more breathing room
        this.padding = Math.max(rect.height, rect.width) * 0.4;
        this.canvas = this.createCanvas(this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.generateControlPoints();
        this.generatePathSegments();
    }

    private generateControlPoints() {
        const rect = this.rect.rect;
        const { curve } = this.options.circle;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Increase base radius to fully encompass text
        const basePadding = this.options.padding * rect.height;
        const radiusX = (rect.width / 2) + basePadding + rect.height * 0.3;
        const radiusY = (rect.height / 2 * this.options.height) + rect.height * 0.4;

        const points = 64;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;

            // Calculate point on ellipse
            const ellipseX = radiusX * Math.cos(angle);
            const ellipseY = radiusY * Math.sin(angle);

            // Calculate point on rounded rectangle (superellipse)
            // curve: 0 = sharp corners (more rectangular), 1 = full ellipse
            const n = 2 + (1 - curve) * 6; // n=2 is ellipse, n=8 is nearly rectangular
            const rectX = radiusX * Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), 2/n);
            const rectY = radiusY * Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), 2/n);

            // Interpolate between rectangle and ellipse based on curve
            const x = centerX + rectX * (1 - curve) + ellipseX * curve;
            const y = centerY + rectY * (1 - curve) + ellipseY * curve;

            this.controlPoints.push({ x, y });
        }
    }

    private generatePathSegments() {
        const { loops, thickness, wobble } = this.options.circle;
        const totalLength = this.totalPoints * loops;
        const segmentSize = 10;
        const numSegments = Math.ceil(totalLength / segmentSize);

        let centerOffset: Point = { x: 0, y: 0 };
        let radiusOffset = 0;
        const maxOffset = this.padding * 0.08;

        for (let seg = 0; seg < numSegments; seg++) {
            const segmentStart = seg * segmentSize;
            const segmentEnd = Math.min((seg + 1) * segmentSize, totalLength);
            const points: Point[] = [];

            for (let i = segmentStart; i <= segmentEnd; i++) {
                const t = (i % this.totalPoints) / this.totalPoints;
                const loopProgress = i / totalLength;

                // Smooth random offset updates
                const targetCenterX = (Math.sin(i * 0.1) * 0.5 + (Math.random() - 0.5) * 0.5) * maxOffset;
                const targetCenterY = (Math.cos(i * 0.1) * 0.5 + (Math.random() - 0.5) * 0.5) * maxOffset;
                const targetRadiusOffset = (Math.sin(i * 0.05) * 0.5 + (Math.random() - 0.5) * 0.5) * maxOffset;

                const smoothingFactor = 0.1;
                centerOffset.x += (targetCenterX - centerOffset.x) * smoothingFactor;
                centerOffset.y += (targetCenterY - centerOffset.y) * smoothingFactor;
                radiusOffset += (targetRadiusOffset - radiusOffset) * smoothingFactor;

                const basePoint = this.getPointOnPath(t, radiusOffset);
                const wobbleOffset = this.getWobbleOffset(t, wobble, loopProgress);

                points.push({
                    x: basePoint.x + wobbleOffset.x + centerOffset.x,
                    y: basePoint.y + wobbleOffset.y + centerOffset.y
                });
            }

            const midProgress = (segmentStart + segmentEnd) / 2 / totalLength;
            const thicknessFactor = this.getThicknessFactor(midProgress);
            const color = this.getColorAtProgress(midProgress);

            this.pathSegments.push({
                points,
                color: color.rgb,
                thickness: thickness * thicknessFactor
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
        const totalSegments = this.pathSegments.length;
        const startSegment = Math.floor(fromProgress * totalSegments);
        const endSegment = Math.min(Math.ceil(toProgress * totalSegments), totalSegments);

        for (let s = startSegment; s < endSegment; s++) {
            const segment = this.pathSegments[s];
            if (segment.points.length < 2) continue;

            this.ctx.strokeStyle = segment.color;
            this.ctx.lineWidth = segment.thickness;
            this.ctx.beginPath();

            this.ctx.moveTo(segment.points[0].x, segment.points[0].y);
            for (let i = 1; i < segment.points.length; i++) {
                this.ctx.lineTo(segment.points[i].x, segment.points[i].y);
            }

            this.ctx.stroke();
        }
    }

    private getPointOnPath(t: number, radiusOffset: number): Point {
        const index = t * this.controlPoints.length;
        const i = Math.floor(index);
        const nextI = (i + 1) % this.controlPoints.length;
        const frac = index - i;

        const p0 = this.controlPoints[i];
        const p1 = this.controlPoints[nextI];

        return {
            x: p0.x + (p1.x - p0.x) * frac + radiusOffset,
            y: p0.y + (p1.y - p0.y) * frac + radiusOffset
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
        const darkenAmount = progress * 30;
        return baseColor.darken(darkenAmount);
    }
}
