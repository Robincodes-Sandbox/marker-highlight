export class Utilities {
    static kebabToCamel(str: string): string {
        return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    }

    static camelToKebab(str: string): string {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    // todo - generate randomness based on seed each time    
    static getRandomVariation(): number {
        return 1 + (Math.random() * 0.2 - 0.1); // Returns a value between 0.9 and 1.1
    }

    static getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static mapRange(value: number, low1: number, high1: number, low2: number, high2: number): number {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }

    /**
     * Calculates a point on a quadratic Bezier curve.
     * @param t A value between 0 and 1 representing the position along the curve.
     * @param p0 The start point of the curve.
     * @param p1 The control point of the curve.
     * @param p2 The end point of the curve.
     * @returns The interpolated value at position t along the curve.
     */
    static bezier(t: number, p0: number, p1: number, p2: number): number {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    }

}