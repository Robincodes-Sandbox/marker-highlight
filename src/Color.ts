/**
 * Minimal color manipulation library
 */
export class Color {
    
    private r!: number;
    private g!: number;
    private b!: number;

    constructor(color: string) {
        if (color.startsWith('#')) {
            this.fromHex(color);
        } else if (color.startsWith('rgb')) {
            this.fromRgb(color);
        } else {
            throw new Error('Unsupported color format');
        }
    }

    copy(): Color {
        const newColor = new Color(this.toRgb());
        return newColor;
    }

    fromHex(hex: string): void {
        const bigint = parseInt(hex.slice(1), 16);
        this.r = (bigint >> 16) & 255;
        this.g = (bigint >> 8) & 255;
        this.b = bigint & 255;
    }

    fromRgb(rgb: string): void {
        const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
        this.r = r;
        this.g = g;
        this.b = b;
    }

    toHex(): string {
        return '#' + (1 << 24 | this.r << 16 | this.g << 8 | this.b).toString(16).slice(1).toUpperCase();
    }

    toRgb(): string {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }

    private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h: number, s: number, l: number = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
                default: h = 0; break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    private hslToRgb(h: number, s: number, l: number): [number, number, number] {
        let r: number, g: number, b: number;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    lighten(percent: number): Color {
        const [h, s, l] = this.rgbToHsl(this.r, this.g, this.b);
        // Adjust saturation inversely to maintain color intensity
        const newS = Math.max(0, s * (1 - percent / 200));
        const newL = Math.min(1, l + (percent / 100) * (1 - l));
        [this.r, this.g, this.b] = this.hslToRgb(h, newS, newL);
        return this;
    }
    
    darken(percent: number): Color {
        const [h, s, l] = this.rgbToHsl(this.r, this.g, this.b);
        // Increase saturation slightly when darkening to maintain richness
        const newS = Math.min(1, s * (1 + percent / 200));
        const newL = Math.max(0, l * (1 - percent / 100));
        [this.r, this.g, this.b] = this.hslToRgb(h, newS, newL);
        return this;
    }

    as(format: 'rgb' | 'hex'): string {
        switch (format) {
            case 'rgb':
                return this.toRgb();
            case 'hex':
                return this.toHex();
            default:
                throw new Error('Unsupported format');
        }
    }

    get rgb(): string {
        return this.toRgb();
    }

    get hex(): string {
        return this.toHex();
    }
}
