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
            count: options.options.burst?.count || 12,
            randomness: options.options.burst?.randomness || 0.3
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
        // Much larger padding for comic book effect - rays need room to breathe
        this.padding = rect.height * Math.max(2.5, this.burstOptions.power * 2);

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

        // Gap between text and where rays start (breathing room)
        const innerGap = rect.height * 0.8;
        const baseLength = rect.height * this.burstOptions.power * 0.75;

        switch (this.burstOptions.style) {
            case 'lines':
            case 'burst':
                this.generateComicRays(centerX, centerY, rect, innerGap, baseLength);
                break;
            case 'curve':
                this.generateCurvedRays(centerX, centerY, rect, innerGap, baseLength);
                break;
            case 'cloud':
                this.generateCloudPuffs(centerX, centerY, rect, innerGap);
                break;
        }
    }

    private generateComicRays(centerX: number, centerY: number, rect: DOMRect, innerGap: number, baseLength: number) {
        const count = this.burstOptions.count;
        const isBurst = this.burstOptions.style === 'burst';

        for (let i = 0; i < count; i++) {
            // Distribute rays around the text
            const baseAngle = (i / count) * Math.PI * 2;
            const angleVariation = (Math.random() - 0.5) * this.burstOptions.randomness * (Math.PI / count);
            const angle = baseAngle + angleVariation;

            // Calculate start point with gap from text edge
            const textRadiusX = rect.width / 2 + innerGap;
            const textRadiusY = rect.height / 2 + innerGap;
            const startX = centerX + textRadiusX * Math.cos(angle);
            const startY = centerY + textRadiusY * Math.sin(angle);

            // Vary ray length for dynamic effect
            const lengthVariation = 0.5 + Math.random() * 1.0;
            const rayLength = baseLength * lengthVariation;

            const endX = startX + Math.cos(angle) * rayLength;
            const endY = startY + Math.sin(angle) * rayLength;

            // Vary line width - thicker at base, thinner at tip (comic style)
            const lineWidth = 2 + Math.random() * 3;

            if (isBurst) {
                // Curved burst lines
                const curveMagnitude = rayLength * 0.3 * (Math.random() - 0.5);
                const perpAngle = angle + Math.PI / 2;
                const controlX = (startX + endX) / 2 + Math.cos(perpAngle) * curveMagnitude;
                const controlY = (startY + endY) / 2 + Math.sin(perpAngle) * curveMagnitude;

                this.elements.push({
                    type: 'curve',
                    points: [
                        { x: startX, y: startY },
                        { x: controlX, y: controlY },
                        { x: endX, y: endY }
                    ],
                    color: this.getRandomColor().rgb,
                    lineWidth,
                    drawn: false
                });
            } else {
                // Straight comic rays
                this.elements.push({
                    type: 'line',
                    points: [{ x: startX, y: startY }, { x: endX, y: endY }],
                    color: this.getRandomColor().rgb,
                    lineWidth,
                    drawn: false
                });
            }
        }
    }

    private generateCurvedRays(centerX: number, centerY: number, rect: DOMRect, innerGap: number, baseLength: number) {
        const count = this.burstOptions.count;

        for (let i = 0; i < count; i++) {
            const baseAngle = (i / count) * Math.PI * 2;
            const angleVariation = (Math.random() - 0.5) * this.burstOptions.randomness * (Math.PI / count);
            const angle = baseAngle + angleVariation;

            // Start with more breathing room
            const textRadiusX = rect.width / 2 + innerGap * 1.2;
            const textRadiusY = rect.height / 2 + innerGap * 1.2;
            const startX = centerX + textRadiusX * Math.cos(angle);
            const startY = centerY + textRadiusY * Math.sin(angle);

            const lengthVariation = 0.6 + Math.random() * 0.8;
            const rayLength = baseLength * lengthVariation;

            // Curved rays with elegant swoosh
            const curveDirection = (i % 2 === 0) ? 1 : -1;
            const curveMagnitude = rayLength * 0.4 * curveDirection;
            const perpAngle = angle + Math.PI / 2;

            const endX = startX + Math.cos(angle) * rayLength;
            const endY = startY + Math.sin(angle) * rayLength;
            const controlX = (startX + endX) / 2 + Math.cos(perpAngle) * curveMagnitude;
            const controlY = (startY + endY) / 2 + Math.sin(perpAngle) * curveMagnitude;

            this.elements.push({
                type: 'curve',
                points: [
                    { x: startX, y: startY },
                    { x: controlX, y: controlY },
                    { x: endX, y: endY }
                ],
                color: this.getRandomColor().rgb,
                lineWidth: 1.5 + Math.random() * 2.5,
                drawn: false
            });
        }
    }

    private generateCloudPuffs(centerX: number, centerY: number, rect: DOMRect, innerGap: number) {
        // Many more puffs for texture
        const puffCount = Math.max(30, this.burstOptions.count * 3);
        const maxPuffRadius = rect.height * 0.5;

        // Create multiple rings of puffs
        const rings = 3;
        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = innerGap * 0.8 + (ring * rect.height * 0.5);
            const puffsInRing = Math.floor(puffCount / rings);

            for (let i = 0; i < puffsInRing; i++) {
                const baseAngle = (i / puffsInRing) * Math.PI * 2;
                const angleVariation = (Math.random() - 0.5) * 0.5;
                const angle = baseAngle + angleVariation;

                // Position with some randomness
                const radiusVariation = (Math.random() - 0.5) * rect.height * 0.3;
                const puffRadiusX = rect.width / 2 + ringRadius + radiusVariation;
                const puffRadiusY = rect.height / 2 + ringRadius + radiusVariation;

                const x = centerX + puffRadiusX * Math.cos(angle);
                const y = centerY + puffRadiusY * Math.sin(angle);

                // Keep within canvas bounds with margin
                const margin = maxPuffRadius + 5;
                if (x < margin || x > this.canvas.width - margin ||
                    y < margin || y > this.canvas.height - margin) {
                    continue;
                }

                // Vary puff sizes - smaller ones add texture
                const sizeVariation = 0.3 + Math.random() * 0.7;
                const puffSize = maxPuffRadius * sizeVariation * (1 - ring * 0.2);

                this.elements.push({
                    type: 'cloud',
                    points: [{ x, y }],
                    color: this.getRandomCloudColor().rgb,
                    lineWidth: Math.max(3, puffSize),
                    drawn: false
                });
            }
        }

        // Add some scattered smaller puffs for extra texture
        for (let i = 0; i < puffCount / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = innerGap + Math.random() * rect.height * 1.2;

            const x = centerX + (rect.width / 2 + distance) * Math.cos(angle);
            const y = centerY + (rect.height / 2 + distance) * Math.sin(angle);

            const margin = 10;
            if (x < margin || x > this.canvas.width - margin ||
                y < margin || y > this.canvas.height - margin) {
                continue;
            }

            const puffSize = 4 + Math.random() * 10;

            this.elements.push({
                type: 'cloud',
                points: [{ x, y }],
                color: this.getRandomCloudColor().rgb,
                lineWidth: puffSize,
                drawn: false
            });
        }
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

    private getRandomColor(): Color {
        const baseColor = new Color(this.color.rgb);
        const variation = 15 * Math.random();
        return Math.random() > 0.5 ? baseColor.lighten(variation) : baseColor.darken(variation);
    }

    private getRandomCloudColor(): Color {
        const baseColor = new Color(this.color.rgb);
        // Clouds should be lighter and more varied
        return baseColor.lighten(20 + Math.random() * 30);
    }
}
