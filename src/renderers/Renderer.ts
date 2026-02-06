import { Utilities } from '../Utilities';
import { Color } from '../Color';
import { RectModel } from '../RectModel';

export interface RendererOptions {
    options: any;
    color: Color;
    rect: RectModel;
}

export interface DrawResult {
    canvas: HTMLCanvasElement;
    height: number;
    verticalOffset: number;
    horizontalPadding: number;
}

export abstract class Renderer {
    protected options: any;
    protected color: Color;
    protected rect: RectModel;
    protected isAnimating: boolean = false;
    protected animationStartTime: number | null = null;
    protected animationProgress: number = 0;
    protected animationDuration: number = 1000;
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected lastStepTime: number | null = null;
    protected accumulatedTime: number = 0;    
    protected isCompleted: boolean = false;

    constructor({ options, color, rect }: RendererOptions) {
        this.options = options;
        this.color = color;
        this.rect = rect;
        this.canvas = this.createCanvas(0);
        this.ctx = this.canvas.getContext('2d')!;
    }

    protected createCanvas(padding: number): HTMLCanvasElement {
        const rect = this.rect.rect;
        const canvas = document.createElement('canvas');
        canvas.width = rect.width + 2 * padding;
        canvas.height = rect.height + 2 * padding;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        return canvas;
    }

    abstract setBounds(): DrawResult;
    
    startAnimation(skipAnimation: boolean = false): void {
        this.isAnimating = !skipAnimation && !this.isCompleted;
        this.animationStartTime = null;
        this.animationProgress = skipAnimation ? 1 : 0;
        
        if (skipAnimation) {
            this.step(0, 1);
            this.isCompleted = true;
        }
    }

    animate(timestamp: number): boolean {
        if (!this.isAnimating) return false;
        
        if (this.animationStartTime === null) {
            this.animationStartTime = timestamp;
            this.lastProgress = 0;
        }

        const elapsed = timestamp - this.animationStartTime;
        this.animationProgress = Math.min(elapsed / this.animationDuration, 1);

        if (this.animationProgress > this.lastProgress) {
            this.step(this.lastProgress, this.animationProgress);
            this.lastProgress = this.animationProgress;
        }

        if (this.animationProgress >= 1) {
            this.isAnimating = false;
            this.isCompleted = true;
            return false;
        }

        return true;
    }

    abstract step(fromProgress: number, toProgress: number): void;

    redrawFull(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.step(0, 1);
    }
}