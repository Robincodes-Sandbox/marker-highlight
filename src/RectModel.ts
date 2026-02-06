export class RectModel {
    rect: DOMRect;
    mark: HTMLElement;

    constructor(rect: DOMRect, mark: HTMLElement) {
        this.rect = rect;
        this.mark = mark;
    }

    isTerminatingWithinText(): boolean {
        const range = document.createRange();
        range.setStartAfter(this.mark);
        range.setEndAfter(this.mark.nextSibling || this.mark);
        const nextRects = Array.from(range.getClientRects());
        if (nextRects.length > 0) {
            return nextRects[0].left > this.rect.right;
        }
        return false;
    }

    isStartingWithinText(): boolean {
        const range = document.createRange();
        range.setStartBefore(this.mark);
        range.setEndBefore(this.mark);
        const previousRects = Array.from(range.getClientRects());
        if (previousRects.length > 0) {
            return previousRects[previousRects.length - 1].right < this.rect.left;
        }
        return false;
    }
}
