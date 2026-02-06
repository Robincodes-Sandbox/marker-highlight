import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

// ask the robot - want to reduce the total number of lines and improve smoothness of rendering, adjust opacity slightly at start and end of the line randomly, differently slightly for each

export default class HighlightRenderer extends Renderer {
    private readonly TOTAL_POINTS = 100;
    private pointsData: Array<{ x: number, y: number }[]>;
    
    private paddingAmount: number;
    private maxFrayOffset: number;
    private highlightHeight: number;
    private lineCount: number;
    // problem - canvas height doesn't factor in height of last line! Also minimises ability to do thin things
    private lineHeight: number = 1;
    private verticalOffset: number;

    private linesVariables: { [key: string]: number } = {};


    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed;
        
        const rect = this.rect.rect;
        this.maxFrayOffset = 4 * (this.options.highlight.roughEnds || 0);
        this.paddingAmount = this.calculatePadding(rect);

        this.highlightHeight = rect.height * (this.options.height || 1);
        this.lineCount = Math.ceil(this.highlightHeight / this.lineHeight);

        this.verticalOffset = (rect.height - this.highlightHeight) / 2;

        // Assign a random number to each line
        for (let i = 0; i < this.lineCount; i++) {
            this.linesVariables[`line${i}`] = Math.random();
        }

        const canvasHeight = this.calculateCanvasHeight(rect);
        this.canvas = this.makeCanvas(this.paddingAmount + this.maxFrayOffset, canvasHeight);
        
        this.ctx = this.canvas.getContext('2d', {
            willReadFrequently: false // Optimize for drawing
        })!;

        this.ctx.imageSmoothingEnabled = true;

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.pointsData = this.generatePointsData();
    }

    private calculatePadding(rect: DOMRect): number {
        const basePadding = (this.options.padding || 0) * rect.height;
        /*const variablePadding = this.options.horizontalPadding.strength * rect.height * 
            (1 + (Math.random() - 0.5) * this.options.horizontalPadding.variation);*/
        return basePadding;
        //return basePadding + variablePadding;
    }

    private calculateCanvasHeight(rect: DOMRect): number {
        const amplitude = this.options.highlight.amplitude * rect.height;
        const verticalPadding = Math.max(amplitude, rect.height * 0.2);
        return this.highlightHeight + 2 * verticalPadding;
    }

    /*private getVerticalPosition(lineIndex: number): number {
        return this.verticalOffset + (lineIndex * this.lineHeight) + (this.lineHeight / 2);
    } */   

    setBounds(): DrawResult {
        const rect = this.rect.rect;
        const amplitude = this.options.highlight.amplitude * rect.height;
        const verticalPadding = Math.max(amplitude, rect.height * 0.2);
        const yOffset = (this.canvas.height - rect.height) / 2;

        return {
            canvas: this.canvas,
            height: this.canvas.height,
            verticalOffset: verticalPadding - this.verticalOffset,
            horizontalPadding: this.paddingAmount
        };
    }

    private generatePointsData(): Array<{ x: number, y: number }[]> {
        const rect = this.rect.rect;
        const waveLength = this.options.highlight.wavelength * rect.height;
        const amplitude = this.options.highlight.amplitude * rect.height / 10;

        return Array.from({ length: this.lineCount }, (_, lineIndex) => {
            const lineStartX = this.maxFrayOffset * (this.rect.isStartingWithinText() ? 0.1 : 1) * Math.random();
            const lineEndX = rect.width + this.paddingAmount * 2 - 
                this.maxFrayOffset * (this.rect.isTerminatingWithinText() ? 0.1 : 1) * Math.random();
            const lineWidth = lineEndX - lineStartX;

            return Array.from({ length: this.TOTAL_POINTS + 1 }, (_, i) => {
                const progress = i / this.TOTAL_POINTS;
                const x = lineStartX + progress * lineWidth;
                const waveProgress = (x - lineStartX) / waveLength;
                const y = this.getVerticalPosition(lineIndex) + 
                    Math.sin(waveProgress * 2 * Math.PI) * amplitude * this.randomFactor();
                return { x, y };
            });
        });
    }

    step(fromProgress: number, toProgress: number): void {

        for (let lineIndex = 0; lineIndex < this.lineCount; lineIndex++) {
            const linePoints = this.pointsData[lineIndex];
            const startIndex = Math.floor(fromProgress * this.TOTAL_POINTS);
            const endIndex = Math.min(Math.ceil(toProgress * this.TOTAL_POINTS), this.TOTAL_POINTS);

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.getLineGradient(lineIndex);
            this.ctx.lineWidth = this.lineHeight * 2;
            

            for (let i = startIndex; i <= endIndex; i++) {
                const point = linePoints[i];
                if (i === startIndex) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    this.ctx.lineTo(point.x, point.y);
                }
            }

            this.ctx.stroke();
        }
    }

    private getVerticalPosition(lineIndex: number): number {
        
        const value = (lineIndex * this.lineHeight) + (this.lineHeight / 2) + 
            ((this.canvas.height - this.highlightHeight) / 2);
        return value;
    }

    private getLineGradient(lineIndex: number): CanvasGradient {
        const rect = this.rect.rect;

        const gradientEffect = 10;
        const painterlyEffect = 10;

        const colorAdjustment = this.linesVariables[`line${lineIndex}`] * painterlyEffect;

        // normalise number between 0 and lineIndex  to 0 and 3
        const v = Utilities.mapRange(lineIndex, 0, this.lineCount, 0, gradientEffect);

        const lineStartColor = this.color.copy().lighten(v + colorAdjustment);
        const lineEndColor = this.color.copy().darken(v + colorAdjustment);

        const gradient = this.ctx.createLinearGradient(0, 0, rect.width, 0);
        gradient.addColorStop(0, lineStartColor.rgb);
        gradient.addColorStop(1, lineEndColor.rgb);
        return gradient;
    }

    private randomFactor(): number {
        return 1; // disabled for now
        return Utilities.getRandomVariation() * (1 + (this.options.highlight.jitter || 0));
    }

    private makeCanvas(horizontalPadding: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = this.rect.rect.width + 2 * horizontalPadding;
        canvas.height = height;
        return canvas;
    }
}