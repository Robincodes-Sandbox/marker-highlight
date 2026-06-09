import { Color } from '../Color';
import { Renderer, RendererOptions, DrawResult } from './Renderer';

interface DashSegment {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/**
 * Hand-drawn dashed underline.
 *
 * Lays a run of short strokes along a single baseline beneath the text. Stroke
 * and gap lengths are configurable and each is perturbed independently
 * (strokeJitter / gapJitter) so the line reads as drawn by hand rather than a
 * CSS `border-bottom: dashed`. Each stroke also gets a tiny vertical wobble and
 * slope. Animates left-to-right, revealing the run by x-position.
 *
 * Position it like the wavy underline: low `height` is irrelevant here (it's a
 * line, not a band) — use `offset` (~0.9) to drop it just under the text.
 */
export default class DashedRenderer extends Renderer {
    private padding: number;
    private segments: DashSegment[] = [];
    private totalWidth: number = 0;
    private thickness: number = 1.5;

    constructor(options: RendererOptions) {
        super(options);
        this.animationDuration = this.options.animationSpeed || 1000;

        const cfg = this.options.dashed || {};
        this.thickness = cfg.thickness ?? 1.5;

        const rect = this.rect.rect;
        // Vertical room for the stroke weight plus the hand-drawn wobble.
        const wobble = (cfg.wobble ?? 0.6) * rect.height * 0.12;
        this.padding = Math.max(this.thickness, wobble) + 2;

        this.canvas = this.makeCanvas(rect.width, rect.height + 2 * this.padding);
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.generateSegments();
    }

    private makeCanvas(width: number, height: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    private generateSegments(): void {
        const rect = this.rect.rect;
        const cfg = this.options.dashed || {};

        // The DASH size is fixed (scaled only to the font), identical on every
        // mark. Only the GAP flexes to fill the width. This is the key to even
        // rendering when a mark wraps across lines: each wrapped fragment then
        // shares the same dash rhythm instead of each fragment scaling its own
        // dash+gap to fit (which is what made narrow mobile fragments look off).
        const dash = (cfg.dashLength ?? 0.5) * rect.height;
        const targetGap = (cfg.gapLength ?? 0.38) * rect.height;
        const dashJitter = cfg.strokeJitter ?? 0.05; // dash length varies ±5%, gaps stay even
        const wobble = (cfg.wobble ?? 0.6) * rect.height * 0.12;

        // Sit at the text baseline (~86% down the line box for typical fonts),
        // not the very bottom of the line box, so a small `offset` reads as a
        // snug underline rather than a line floating below the text.
        const baseY = this.padding + rect.height * 0.86;
        const width = rect.width;
        this.totalWidth = width;

        // Fit a whole number of fixed-size dashes with a full dash at BOTH ends.
        const n = Math.max(1, Math.round((width - dash) / (dash + targetGap)) + 1);
        // Gap that exactly fills the remaining width — uniform within the mark.
        const gap = n > 1 ? (width - n * dash) / (n - 1) : 0;
        const period = dash + gap;

        // The dashes ride ONE smooth, gently-undulating line. Its wavelength is
        // fixed in absolute terms (proportional to text size), so a short wrapped
        // fragment undulates at the same rate as a wide mark rather than cramming
        // the same wave count into less width. A small 2nd harmonic stays organic.
        const wavelength = rect.height * 6; // ~6 line-heights per wave
        const waves = Math.max(0.6, width / wavelength);
        const phase = this.rand() * Math.PI * 2;
        const phase2 = this.rand() * Math.PI * 2;
        const w = Math.max(width, 1);
        const curveY = (x: number) =>
            baseY +
            Math.sin((x / w) * Math.PI * 2 * waves + phase) * wobble +
            Math.sin((x / w) * Math.PI * 2 * waves * 1.9 + phase2) * wobble * 0.25;

        for (let i = 0; i < n; i++) {
            const x0 = i * period;
            const jittered = dash * (1 + (this.rand() - 0.5) * 2 * dashJitter);
            // Last dash ends exactly at the width; interior dashes keep their tiny
            // length jitter but never eat into the (even) gap.
            const x1 = i === n - 1 ? width : Math.min(x0 + jittered, x0 + dash + gap * 0.5);
            this.segments.push({ x0, y0: curveY(x0), x1, y1: curveY(x1) });
        }
    }

    private rand(): number {
        return Math.random();
    }

    setBounds(): DrawResult {
        const rect = this.rect.rect;
        return {
            canvas: this.canvas,
            height: this.canvas.height,
            // Cancel the core's +0.1*height nudge so `offset` alone places the line.
            verticalOffset: this.padding - rect.height * 0.1,
            horizontalPadding: 0
        };
    }

    step(fromProgress: number, toProgress: number): void {
        const revealTo = toProgress * this.totalWidth;
        const revealFrom = fromProgress * this.totalWidth;

        this.ctx.save();
        // Clip to the freshly-revealed x-slice so the run draws on left-to-right.
        this.ctx.beginPath();
        this.ctx.rect(revealFrom, 0, Math.max(revealTo - revealFrom, 0), this.canvas.height);
        this.ctx.clip();

        this.ctx.strokeStyle = this.color.rgb;
        this.ctx.lineWidth = this.thickness;

        for (const s of this.segments) {
            if (s.x1 < revealFrom || s.x0 > revealTo) continue;
            this.ctx.beginPath();
            this.ctx.moveTo(s.x0, s.y0);
            this.ctx.lineTo(s.x1, s.y1);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}
