import { OptionsValidator } from './Options';
import { RectModel } from './RectModel';
import { Color } from './Color';
import RendererFactory from './renderers/RendererFactory';

export class MarkerHighlighter {

    private debugTooltip: HTMLElement | null = null;
    private element: HTMLElement;
    private options: Record<string, any>;
    private validator: OptionsValidator;
    private static styles: { [key: string]: Record<string, any> } = {};
    private renderers: Map<HTMLElement, any[]> = new Map();
    private highlightDivs: Map<HTMLElement, HTMLElement[]> = new Map();
    private animationFrameIds: Map<HTMLElement, number[]> = new Map();
    private observer: IntersectionObserver | null = null;
    private initialized: boolean = false;
    private resizeRafId: number | null = null;

    constructor(element: HTMLElement, options: Record<string, any> = {}) {
        if (element.hasAttribute('data-marker-initialized')) {
            console.warn('MarkerHighlighter already initialized for this element');
            return;
        }
        element.setAttribute('data-marker-initialized', 'true');

        this.element = element;
        this.validator = new OptionsValidator();
        this.options = this.validator.validate(options);
        this.setupIntersectionObserver();

        // Create stacking context at container level
        if (element.parentElement) {
            const containerStyle = window.getComputedStyle(element.parentElement);
            if (containerStyle.position === 'static') {
                element.parentElement.style.position = 'relative';
            }
            element.parentElement.style.zIndex = '0';
        }

        const initHighlights = () => {
            if (this.initialized) return;
            this.initialized = true;
            this.highlightText(false);
        };

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                setTimeout(initHighlights, 0);
            });
        } else {
            setTimeout(initHighlights, 100);
        }

        if (this.options.debug) {
            this.setupDebugMode();
        }

        this.addEventListeners();
    }

    static defineStyle(name: string, options: Record<string, any>) {
        MarkerHighlighter.styles[name] = options;
    }

    static getStyle(name: string): Record<string, any> {
        return MarkerHighlighter.styles[name] || {};
    }


    private setupDebugMode() {
        // Create tooltip element
        this.debugTooltip = document.createElement('div');
        this.debugTooltip.style.cssText = `
            position: fixed;
            padding: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 9999;
            display: none;
            max-width: 300px;
            white-space: pre-wrap;
        `;
        document.body.appendChild(this.debugTooltip);

        // Add mousemove listener
        document.addEventListener('mousemove', (e) => {
            if (!this.debugTooltip) return;

            const target = e.target as HTMLElement;
            const highlightDiv = target.closest('.highlight') as HTMLElement;

            if (highlightDiv) {
                const markId = highlightDiv.getAttribute('data-mark-id');
                if (markId) {
                    const mark = document.querySelector(`[data-mark-ref="${markId}"]`) as HTMLElement;
                    if (mark) {
                        const options = this.getElementOptions(mark);
                        this.debugTooltip.textContent = JSON.stringify(options, null, 2);
                        this.debugTooltip.style.display = 'block';
                        this.debugTooltip.style.left = `${e.pageX + 15}px`;
                        this.debugTooltip.style.top = `${e.pageY + 15}px`;
                    }
                }
            } else {
                this.debugTooltip.style.display = 'none';
            }
        });
    }

    private getElementOptions(mark: HTMLElement): Record<string, any> {
        const baseOptions = { ...this.options };
        const styleName = mark.getAttribute('data-highlight-style') || mark.getAttribute('my-style');
        const styleOptions = styleName ? MarkerHighlighter.getStyle(styleName) : {};
        const elementOptions = this.validator.extractAttributes(mark);

        return {
            base: baseOptions,
            style: styleOptions,
            element: elementOptions,
            final: { ...baseOptions, ...styleOptions, ...elementOptions }
        };
    }

    private setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const highlightDiv = entry.target as HTMLElement;
                    const markId = highlightDiv.getAttribute('data-mark-id');
                    const segmentIndex = parseInt(highlightDiv.getAttribute('data-segment-index') || '0');

                    if (markId) {
                        const mark = document.querySelector(`[data-mark-ref="${markId}"]`) as HTMLElement;
                        if (mark) {
                            const renderers = this.renderers.get(mark);
                            if (renderers && renderers[segmentIndex] && !renderers[segmentIndex].isCompleted) {
                                this.startSegmentAnimation(mark, segmentIndex, false);
                            }
                        }
                    }
                }
            });
        }, {
            threshold: 0.5
        });
    }

    private getRelativeOffset(element: HTMLElement): { top: number; left: number } {
        let offsetTop = 0;
        let offsetLeft = 0;
        let currentElement = element.parentElement;

        while (currentElement && currentElement !== document.body) {
            const style = window.getComputedStyle(currentElement);
            if (style.position === 'relative') {
                offsetTop += currentElement.offsetTop;
                offsetLeft += currentElement.offsetLeft;
            }
            currentElement = currentElement.parentElement;
        }

        return { top: offsetTop, left: offsetLeft };
    }

    private getMarkDepth(mark: HTMLElement): number {
        let depth = 0;
        let currentElement: HTMLElement | null = mark;

        while (currentElement) {
            if (currentElement.tagName === 'MARK') {
                depth++;
            }
            currentElement = currentElement.parentElement;
        }

        return depth;
    }

    private ensureTextVisibility(mark: HTMLElement) {
        // Ensure mark content is visible
        mark.style.position = 'relative';
        const maxZ = '999999';
        mark.style.zIndex = maxZ;

        // Handle siblings
        let sibling = mark.previousSibling;
        while (sibling) {
            if (sibling.nodeType === Node.TEXT_NODE) {
                const span = document.createElement('span');
                span.style.position = 'relative';
                span.style.zIndex = maxZ;
                span.textContent = sibling.textContent;
                sibling.parentNode?.replaceChild(span, sibling);
            }
            sibling = sibling.previousSibling;
        }

        sibling = mark.nextSibling;
        while (sibling) {
            if (sibling.nodeType === Node.TEXT_NODE) {
                const span = document.createElement('span');
                span.style.position = 'relative';
                span.style.zIndex = maxZ;
                span.textContent = sibling.textContent;
                sibling.parentNode?.replaceChild(span, sibling);
            }
            sibling = sibling.nextSibling;
        }
    }

    private clearExistingHighlights() {
        const container = this.element.parentElement;
        if (container) {
            const existingHighlights = container.querySelectorAll('.highlight');
            existingHighlights.forEach(highlight => highlight.remove());

            const marks = container.querySelectorAll('mark[data-mark-ref]');
            marks.forEach(mark => {
                mark.removeAttribute('data-mark-ref');
                mark.style.position = '';
                mark.style.zIndex = '';
            });

            // Clean up wrapped text nodes (created by ensureTextVisibility)
            const wrappedTexts = container.querySelectorAll('span[style*="z-index: 999999"]');
            wrappedTexts.forEach(span => {
                const text = document.createTextNode(span.textContent || '');
                span.parentNode?.replaceChild(text, span);
            });
        }
        this.stopAllAnimations();
        this.highlightDivs.clear();
        this.renderers.clear();
    }

    private stopAllAnimations() {
        this.animationFrameIds.forEach((ids, mark) => {
            ids.forEach(id => {
                if (id) cancelAnimationFrame(id);
            });
            this.animationFrameIds.delete(mark);
        });
    }

    private highlightText(isResize: boolean = false) {
        // Collect old highlight divs — keep them visible until replacements are in place
        const parentContainer = this.element.parentElement;
        const oldHighlights = parentContainer
            ? Array.from(parentContainer.querySelectorAll('.highlight'))
            : [];

        // Clean internal state without removing DOM elements
        this.stopAllAnimations();
        this.highlightDivs.clear();
        this.renderers.clear();

        // Reset mark attributes so they can be re-processed
        if (parentContainer) {
            const existingMarks = parentContainer.querySelectorAll('mark[data-mark-ref]');
            existingMarks.forEach(mark => {
                mark.removeAttribute('data-mark-ref');
                (mark as HTMLElement).style.position = '';
                (mark as HTMLElement).style.zIndex = '';
            });

            const wrappedTexts = parentContainer.querySelectorAll('span[style*="z-index: 999999"]');
            wrappedTexts.forEach(span => {
                const text = document.createTextNode(span.textContent || '');
                span.parentNode?.replaceChild(text, span);
            });
        }

        // Create new highlights
        const marks = this.element.querySelectorAll('mark');

        marks.forEach((mark: HTMLElement, markIndex) => {
            const container = mark.parentElement;
            const markId = mark.getAttribute('id') || `mark-${markIndex}`;
            mark.setAttribute('data-mark-ref', markId);

            const baseOptions = { ...this.options };
            const styleName = mark.getAttribute('data-highlight-style');
            const styleOptions = styleName ? MarkerHighlighter.getStyle(styleName) : {};
            const elementOptions = this.validator.extractAttributes(mark);

            const mergedOptions = {
                ...baseOptions,
                ...styleOptions,
                ...elementOptions
            };

            const combinedOptions = this.validator.validate(mergedOptions);
            const shouldAnimate = combinedOptions.animate !== false;
            const skipAnimation = !shouldAnimate || isResize;

            this.highlightMark(mark, combinedOptions, container, skipAnimation, isResize);
        });

        // Now remove old highlights — new ones are already in the DOM
        oldHighlights.forEach(h => h.remove());
    }

    private highlightMark(mark: HTMLElement, options: Record<string, any>, container: HTMLElement | null, skipAnimation: boolean, isResize: boolean) {
        const range = document.createRange();
        range.selectNodeContents(mark);
        const rects = range.getClientRects();

        // Calculate proper z-index based on nesting (starting at 1 for base level)
        const nestingDepth = this.getMarkDepth(mark);
        const zIndex = nestingDepth === 1 ? 1 : 1000 + nestingDepth;

        // Ensure text visibility
        this.ensureTextVisibility(mark);

        // Get the offset from relatively positioned parents
        const relativeOffset = this.getRelativeOffset(mark);

        if (!mark.hasAttribute('data-original-bgcolor')) {
            const markBackgroundColor = getComputedStyle(mark).backgroundColor;
            mark.setAttribute('data-original-bgcolor', markBackgroundColor);
        }
        mark.style.backgroundColor = 'transparent';

        const color = new Color(mark.getAttribute('data-original-bgcolor') as string);
        const markId = mark.getAttribute('data-mark-ref');

        const markRenderers: any[] = [];
        const markDivs: HTMLElement[] = [];
        this.renderers.set(mark, markRenderers);
        this.highlightDivs.set(mark, markDivs);

        Array.from(rects).forEach((rect, index) => {
            try {
                const rectModel = new RectModel(rect, mark);
                const highlightDiv = document.createElement('div');
                highlightDiv.className = 'highlight';

                highlightDiv.style.zIndex = zIndex.toString();
                highlightDiv.setAttribute('data-mark-id', markId!);
                highlightDiv.setAttribute('data-segment-index', String(index));

                const renderer = RendererFactory.getRenderer({
                    mode: options.drawingMode,
                    options,
                    color,
                    rect: rectModel
                });

                markRenderers.push(renderer);
                markDivs.push(highlightDiv);

                const highlightBounds = renderer.setBounds();
                highlightDiv.appendChild(highlightBounds.canvas);

                const lowHeightOffset = 0;
                const positionOffset = options.offset * rect.height / 2;

                let hv = highlightBounds.verticalOffset;

                if (options.skewX || options.skewY) {
                    const skewX = (options.skewX || 0) * rect.height;
                    const skewY = (options.skewY || 0) * rect.height;
                    highlightDiv.style.transform = `skew(${skewX}deg, ${skewY}deg)`;
                    highlightDiv.style.transformOrigin = 'center';
                }

                // Adjustment to counter the additional height added to accomodate the amplitude
                hv += rect.height * .1;

                highlightDiv.style.position = 'absolute';
                highlightDiv.style.top = `${rect.top + window.scrollY - hv + lowHeightOffset + positionOffset - relativeOffset.top}px`;
                highlightDiv.style.left = `${rect.left + window.scrollX - highlightBounds.horizontalPadding - relativeOffset.left}px`;
                highlightDiv.style.width = `${rect.width + 2 * highlightBounds.horizontalPadding}px`;
                highlightDiv.style.height = `${Math.max(rect.height, highlightBounds.height)}px`;
                highlightDiv.style.pointerEvents = 'none';

                if (container) {
                    container.appendChild(highlightDiv);
                }

                if (options.animationTrigger === 'scrollIntoView') {
                    if (isResize) {
                        const rect = highlightDiv.getBoundingClientRect();
                        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
                        if (isVisible) {
                            this.startSegmentAnimation(mark, index, true);
                        } else {
                            this.observer?.observe(highlightDiv);
                        }
                    } else {
                        this.observer?.observe(highlightDiv);
                    }
                } else {
                    this.startSegmentAnimation(mark, index, skipAnimation);
                }

                if (this.options.debug) {
                    highlightDiv.style.border = '1px dashed red';
                }

            } catch (e) {
                console.error(e);
            }
        });
    }

    private startSegmentAnimation(mark: HTMLElement, segmentIndex: number, skipAnimation: boolean) {
        const renderers = this.renderers.get(mark);
        if (!renderers || !renderers[segmentIndex]) return;

        const options = this.getElementOptions(mark).final;
        const delay = options.delay || 0;
        const multiLineDelay = options.multiLineDelay || 0;        

        const totalDelay = delay + (multiLineDelay * segmentIndex * options.animationSpeed);

        setTimeout(() => {
            const renderer = renderers[segmentIndex];
            renderer.startAnimation(skipAnimation);

            if (!skipAnimation) {
                const animate = (timestamp: number) => {
                    const isAnimating = renderer.animate(timestamp);
                    if (isAnimating) {
                        const animationIds = this.animationFrameIds.get(mark) || [];
                        animationIds[segmentIndex] = requestAnimationFrame(animate);
                        this.animationFrameIds.set(mark, animationIds);
                    } else {
                        const animationIds = this.animationFrameIds.get(mark);
                        if (animationIds) {
                            animationIds[segmentIndex] = 0;
                            if (!animationIds.some(id => id !== 0)) {
                                this.animationFrameIds.delete(mark);
                            }
                        }
                    }
                };

                const animationIds = this.animationFrameIds.get(mark) || new Array(renderers.length).fill(0);
                animationIds[segmentIndex] = requestAnimationFrame(animate);
                this.animationFrameIds.set(mark, animationIds);
            }
        }, totalDelay);            
    }

    setOption(option: string, value: any) {
        this.options[option] = value;
    }

    setOptions(options: Record<string, any>) {
        this.options = {
            ...this.options,
            ...options
        };
    }

    public reanimateMark(mark: HTMLElement) {
        const renderers = this.renderers.get(mark);
        if (renderers) {
            renderers.forEach(renderer => {
                renderer.isCompleted = false;
            });
            renderers.forEach((_, index) => {
                this.startSegmentAnimation(mark, index, false);
            });
        }
    }

    private addEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this));
        document.addEventListener('input', this.handleContentChange.bind(this));
        document.addEventListener('change', this.handleContentChange.bind(this));
        window.addEventListener('zoom', this.handleZoom.bind(this));
    }

    private handleResize() {
        if (this.resizeRafId) cancelAnimationFrame(this.resizeRafId);
        this.resizeRafId = requestAnimationFrame(() => {
            this.highlightText(true);
            this.resizeRafId = null;
        });
    }

    private handleContentChange() {
        this.highlightText(false);
    }

    private handleZoom() {
        this.highlightText(true);
    }

    public rerunHighlight() {
        this.highlightText(false);
    }
}