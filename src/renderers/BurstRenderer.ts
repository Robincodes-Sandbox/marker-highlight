import { Renderer, RendererOptions, DrawResult } from './Renderer';
import { Color } from '../Color';
import { Utilities } from '../Utilities';

interface BurstOptions {
    style: 'lines' | 'burst' | 'curve' | 'cloud';
    power: number;
    count: number;
    randomness: number;
}

interface BurstElement {
    type: 'line' | 'curve' | 'cloud';
    points: { x: number; y: number }[];
    color: string;
    lineWidth: number;
    drawn: boolean;
}

export default class BurstRenderer extends Renderer {
    private burstOptions: BurstOptions;
    private elements: BurstElement[] = [];
    private padding: number = 0;

    constructor(options: RendererOptions) {
        super(options);
        this.burstOptions = {
            style: options.options.burst?.style || 'lines',
            power: options.options.burst?.power || 1,
            count: options.options.burst?.count || 10,
            randomness: options.options.burst?.randomness || 0.5
        };
        this.animationDuration = this.options.animationSpeed || 1000;
        this.validateBurstOptions();
    }

    private validateBurstOptions() {
        if (this.burstOptions.count < 3) this.burstOptions.count = 3;
        if (this.burstOptions.power < 0.1) this.burstOptions.power = 0.1;
        if (this.burstOptions.randomness < 0) this.burstOptions.randomness = 0;
        if (this.burstOptions.randomness > 1) this.burstOptions.randomness = 1;
    }

    setBounds(): DrawResult {
        const rect = this.rect.rect;
        this.padding = rect.height * Math.max(1.5, this.burstOptions.power);

        this.canvas = this.createCanvas(this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.generateElements();

        return {
            canvas: this.canvas,
            height: rect.height + 2 * this.padding,
            verticalOffset: this.padding,
            horizontalPadding: this.padding
        };
    }

    private generateElements() {
        const rect = this.rect.rect;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const baseLength = rect.height * this.burstOptions.power;

        for (let i = 0; i < this.burstOptions.count; i++) {
            const angle = this.getRandomAngle(i);
            const length = this.getRandomLength(baseLength);
            const startX = centerX + (rect.width / 2) * Math.cos(angle);
            const startY = centerY + (rect.height / 2) * Math.sin(angle);
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;

            let element: BurstElement;

            switch (this.burstOptions.style) {
                case 'lines':
                    element = this.createLineElement(startX, startY, endX, endY);
                    break;
                case 'burst':
                    element = this.createBurstElement(startX, startY, endX, endY);
                    break;
                case 'curve':
                    element = this.createCurveElement(startX, startY, angle, length);
                    break;
                case 'cloud':
                    element = this.createCloudElement(startX, startY, angle, length);
                    break;
                default:
                    element = this.createLineElement(startX, startY, endX, endY);
            }

            this.elements.push(element);
        }
    }

    private createLineElement(startX: number, startY: number, endX: number, endY: number): BurstElement {
        return {
            type: 'line',
            points: [{ x: startX, y: startY }, { x: endX, y: endY }],
            color: this.getRandomColor().rgb,
            lineWidth: this.getRandomLineWidth(),
            drawn: false
        };
    }

    private createBurstElement(startX: number, startY: number, endX: number, endY: number): BurstElement {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const controlX = midX + (Math.random() - 0.5) * (endX - startX) * 0.5;
        const controlY = midY + (Math.random() - 0.5) * (endY - startY) * 0.5;
        return {
            type: 'curve',
            points: [
                { x: startX, y: startY },
                { x: controlX, y: controlY },
                { x: endX, y: endY }
            ],
            color: this.getRandomColor().rgb,
            lineWidth: this.getRandomLineWidth(),
            drawn: false
        };
    }

    private createCurveElement(startX: number, startY: number, angle: number, length: number): BurstElement {
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        const controlX = startX + Math.cos(angle + Math.PI / 2) * length * 0.5;
        const controlY = startY + Math.sin(angle + Math.PI / 2) * length * 0.5;
        return {
            type: 'curve',
            points: [
                { x: startX, y: startY },
                { x: controlX, y: controlY },
                { x: endX, y: endY }
            ],
            color: this.getRandomColor().rgb,
            lineWidth: this.getRandomLineWidth(),
            drawn: false
        };
    }

    private createCloudElement(startX: number, startY: number, angle: number, length: number): BurstElement {
        const x = startX + Math.cos(angle) * length;
        const y = startY + Math.sin(angle) * length;
        return {
            type: 'cloud',
            points: [{ x, y }],
            color: this.getRandomCloudColor().rgb,
            lineWidth: length * 0.5,
            drawn: false
        };
    }

    step(fromProgress: number, toProgress: number): void {
        const startIndex = Math.floor(fromProgress * this.elements.length);
        const endIndex = Math.min(Math.ceil(toProgress * this.elements.length), this.elements.length);

        for (let i = startIndex; i < endIndex; i++) {
            const element = this.elements[i];
            if (element.drawn) continue;

            this.ctx.strokeStyle = element.color;
            this.ctx.fillStyle = element.color;
            this.ctx.lineWidth = element.lineWidth;

            switch (element.type) {
                case 'line':
                    this.drawLine(element);
                    break;
                case 'curve':
                    this.drawCurve(element);
                    break;
                case 'cloud':
                    this.drawCloud(element);
                    break;
            }

            element.drawn = true;
        }
    }

    private drawLine(element: BurstElement) {
        const [start, end] = element.points;
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
    }

    private drawCurve(element: BurstElement) {
        const [start, control, end] = element.points;
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        this.ctx.stroke();
    }

    private drawCloud(element: BurstElement) {
        const { x, y } = element.points[0];
        const size = element.lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private getRandomAngle(index: number): number {
        const baseAngle = (index / this.burstOptions.count) * Math.PI * 2;
        const randomOffset = (Math.random() - 0.5) * this.burstOptions.randomness * Math.PI;
        return baseAngle + randomOffset;
    }

    private getRandomLength(baseLength: number): number {
        return baseLength * (0.7 + Math.random() * 0.6);
    }

    private getRandomColor(): Color {
        const baseColor = new Color(this.color.rgb);
        const variation = 20 * Math.random();
        return Math.random() > 0.5 ? baseColor.lighten(variation) : baseColor.darken(variation);
    }

    private getRandomCloudColor(): Color {
        const baseColor = new Color(this.color.rgb);
        return baseColor.lighten(30 + 20 * Math.random());
    }

    private getRandomLineWidth(): number {
        return 1 + 3 * Math.random();
    }
}
