import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '@chenglou/pretext'
import { OptionsValidator } from './Options'
import { Color } from './Color'
import RendererFactory from './renderers/RendererFactory'
import type { DrawResult } from './renderers/Renderer'

// --- Public types ---

export interface PretextMark {
  /** Text phrase to highlight (matched in rendered lines) */
  phrase: string
  /** Highlight color (hex or rgb) */
  color?: string
  /** Drawing mode override for this mark */
  drawingMode?: string
  /** Style name (defined via defineStyle) */
  style?: string
  /** Any additional per-mark highlight options */
  options?: Record<string, any>
}

export interface PretextObstacle {
  x: number
  y: number
  width: number
  height: number
  margin?: number
  /** Convex polygon vertices for contour-based text nestling (absolute coordinates) */
  polygon?: { x: number; y: number }[]
}

export interface PretextHighlighterOptions {
  font: string
  lineHeight: number
  /** Container padding in px (renamed to avoid conflict with highlight padding) */
  containerPadding?: number
  columns?: number
  columnGap?: number
  paragraphGap?: number
  /** Content: array of paragraph strings */
  paragraphs?: string[]
  /** Marks to apply to the content */
  marks?: PretextMark[]
  /** Obstacles that text flows around */
  obstacles?: PretextObstacle[]
  /** Callback when layout changes (with performance metrics) */
  onLayout?: (metrics: PretextMetrics) => void
  // Standard highlight options (defaults for all marks)
  animate?: boolean
  animationSpeed?: number
  animationTrigger?: string
  height?: number
  offset?: number
  padding?: number
  drawingMode?: string
  highlight?: any
  circle?: any
  burst?: any
  debug?: boolean
  multiLineDelay?: number
  delay?: number
  easing?: string
  skewX?: number
  skewY?: number
  [key: string]: any
}

export interface PretextMetrics {
  prepareMs: number
  layoutMs: number
  renderMs: number
  lineCount: number
  paragraphCount: number
}

// --- Internal types ---

interface PlacedLine {
  x: number
  y: number
  text: string
  width: number
  paragraphIndex: number
  charStart: number
  charEnd: number
  column: number
}

interface HighlightSegment {
  x: number
  y: number
  width: number
  height: number
  markIndex: number
  isFirst: boolean
  isLast: boolean
}

/**
 * Duck-typed rect model compatible with the renderer system.
 * Replaces DOMRect + RectModel for pretext-computed positions.
 */
class VirtualRect {
  rect: {
    x: number; y: number; width: number; height: number
    top: number; left: number; right: number; bottom: number
  }
  private _startsWithin: boolean
  private _terminatesWithin: boolean

  constructor(
    x: number, y: number, width: number, height: number,
    startsWithin: boolean = false, terminatesWithin: boolean = false,
  ) {
    this.rect = {
      x, y, width, height,
      top: y, left: x,
      right: x + width, bottom: y + height,
    }
    this._startsWithin = startsWithin
    this._terminatesWithin = terminatesWithin
  }

  isStartingWithinText(): boolean { return this._startsWithin }
  isTerminatingWithinText(): boolean { return this._terminatesWithin }
}


// --- Main class ---

export class PretextHighlighter {
  private container: HTMLElement
  private stage: HTMLElement
  private font: string
  private lineHeight: number
  private containerPadding: number
  private columns: number
  private columnGap: number
  private paragraphGap: number
  private options: Record<string, any>
  private validator: OptionsValidator
  private onLayoutCallback: ((m: PretextMetrics) => void) | null

  // Content
  private paragraphTexts: string[] = []
  private markDefs: PretextMark[] = []
  private obstacles: PretextObstacle[] = []

  // Prepared pretext data (cached — only recomputed when content/font changes)
  private prepared: PreparedTextWithSegments[] = []
  private prepareTimeMs: number = 0

  // Layout results
  private lines: PlacedLine[] = []
  private highlightSegments: HighlightSegment[] = []

  // DOM pools
  private linePool: HTMLDivElement[] = []
  private highlightPool: HTMLDivElement[] = []

  // Animation
  private renderers: any[] = []
  private animationFrameIds: number[] = []
  private observer: IntersectionObserver | null = null

  // Canvas for measuring mark offsets within lines
  private measureCtx: CanvasRenderingContext2D

  // Resize
  private resizeRafId: number | null = null
  private lastContainerWidth: number = 0

  // Track marks whose animation has been shown (persists across resize)
  private shownMarks: Set<number> = new Set()

  // Named styles (shared with MarkerHighlighter)
  private static styles: Record<string, Record<string, any>> = {}

  constructor(container: HTMLElement, options: PretextHighlighterOptions) {
    this.container = container
    this.font = options.font
    this.lineHeight = options.lineHeight
    this.containerPadding = options.containerPadding ?? 0
    this.columns = options.columns ?? 1
    this.columnGap = options.columnGap ?? 24
    this.paragraphGap = options.paragraphGap ?? Math.round(options.lineHeight * 0.6)
    this.onLayoutCallback = options.onLayout ?? null
    this.validator = new OptionsValidator()

    // Validate highlight defaults (strip pretext-specific options)
    const highlightDefaults = { ...options }
    delete highlightDefaults.font
    delete highlightDefaults.lineHeight
    delete highlightDefaults.containerPadding
    delete highlightDefaults.paragraphs
    delete highlightDefaults.marks
    delete highlightDefaults.obstacles
    delete highlightDefaults.onLayout
    delete highlightDefaults.columns
    delete highlightDefaults.columnGap
    delete highlightDefaults.paragraphGap
    this.options = this.validator.validate(highlightDefaults)

    // Ensure container is a positioned element so absolutely-positioned
    // children (lines, highlights, SVG shapes) all share the same coordinate system
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }

    // Stage is just a logical grouping element (no positioning)
    this.stage = container

    // Measurement canvas
    const mc = document.createElement('canvas')
    this.measureCtx = mc.getContext('2d')!
    this.measureCtx.font = this.font

    // Content
    if (options.paragraphs) this.paragraphTexts = options.paragraphs
    if (options.marks) this.markDefs = options.marks
    if (options.obstacles) this.obstacles = options.obstacles

    // Intersection observer
    if (this.options.animationTrigger === 'scrollIntoView') {
      this.observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const idx = parseInt((entry.target as HTMLElement).dataset.segIdx || '0')
            this.startAnimation(idx, false)
            this.observer?.unobserve(entry.target)
          }
        },
        { threshold: 0.5 },
      )
    }

    // Prepare + initial render
    this.prepareText()
    this.relayout()

    // Resize listener
    window.addEventListener('resize', this.handleResize)
  }

  // --- Static style registry ---

  static defineStyle(name: string, options: Record<string, any>) {
    PretextHighlighter.styles[name] = options
  }

  static getStyle(name: string): Record<string, any> {
    return PretextHighlighter.styles[name] || {}
  }

  // --- Public API ---

  setContent(paragraphs: string[], marks?: PretextMark[]) {
    this.paragraphTexts = paragraphs
    if (marks) this.markDefs = marks
    this.shownMarks.clear()
    this.prepareText()
    this.relayout()
  }

  setMarks(marks: PretextMark[]) {
    this.markDefs = marks
    this.shownMarks.clear()
    this.relayout()
  }

  setObstacles(obstacles: PretextObstacle[]) {
    this.obstacles = obstacles
    this.relayout()
  }

  refresh() {
    this.relayout()
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize)
    this.stopAllAnimations()
    this.observer?.disconnect()
    // Remove managed elements (lines and highlights)
    for (const el of this.linePool) el.remove()
    for (const el of this.highlightPool) el.remove()
    this.linePool = []
    this.highlightPool = []
  }

  get metrics(): PretextMetrics {
    return {
      prepareMs: this.prepareTimeMs,
      layoutMs: 0, // set during relayout
      renderMs: 0,
      lineCount: this.lines.length,
      paragraphCount: this.paragraphTexts.length,
    }
  }

  // --- Text preparation (expensive, cached) ---

  private prepareText() {
    const t0 = performance.now()
    this.prepared = this.paragraphTexts.map(text =>
      prepareWithSegments(text, this.font),
    )
    this.prepareTimeMs = performance.now() - t0
  }

  // --- Layout (fast arithmetic, re-run on resize) ---

  private relayout() {
    const t0 = performance.now()

    const containerWidth = this.container.clientWidth - 2 * this.containerPadding
    const columnWidth = this.columns > 1
      ? (containerWidth - (this.columns - 1) * this.columnGap) / this.columns
      : containerWidth

    // Two-pass layout for multi-column: first pass to estimate total height,
    // second pass with the column height target.
    if (this.columns > 1) {
      this.lines = this.layoutColumns(columnWidth, containerWidth)
    } else {
      this.lines = this.layoutSingleColumn(columnWidth)
    }

    const layoutMs = performance.now() - t0

    // Compute highlight segments
    this.computeHighlightSegments()

    // Render
    const t1 = performance.now()
    this.render()
    const renderMs = performance.now() - t1

    // Report metrics
    if (this.onLayoutCallback) {
      this.onLayoutCallback({
        prepareMs: this.prepareTimeMs,
        layoutMs,
        renderMs,
        lineCount: this.lines.length,
        paragraphCount: this.paragraphTexts.length,
      })
    }
  }

  // --- Single-column layout ---

  private layoutSingleColumn(columnWidth: number): PlacedLine[] {
    const lines: PlacedLine[] = []
    let y = 0

    for (let pi = 0; pi < this.prepared.length; pi++) {
      const prepared = this.prepared[pi]
      const paraText = this.paragraphTexts[pi]
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
      let charOffset = 0

      for (;;) {
        const colX = this.containerPadding
        const slot = this.getLineSlot(colX, y, columnWidth)
        const line = layoutNextLine(prepared, cursor, slot.width)
        if (line === null) break

        lines.push({
          x: slot.x, y,
          text: line.text, width: line.width,
          paragraphIndex: pi,
          charStart: charOffset, charEnd: charOffset + line.text.length,
          column: 0,
        })

        charOffset += line.text.length
        while (charOffset < paraText.length && /\s/.test(paraText[charOffset])) charOffset++
        cursor = line.end
        y += this.lineHeight
      }
      y += this.paragraphGap
    }
    return lines
  }

  // --- Multi-column layout ---

  private layoutColumns(columnWidth: number, _containerWidth: number): PlacedLine[] {
    // Find the target column height that produces the most balanced columns.
    // Strategy: scan a range of targets around the ideal (totalHeight / columns)
    // and pick the one with the smallest height difference between columns.

    const singlePass = this.layoutSingleColumnRaw(columnWidth)
    const totalHeight = singlePass.length > 0
      ? singlePass[singlePass.length - 1].y + this.lineHeight + this.paragraphGap
      : 0

    const idealTarget = Math.ceil(totalHeight / this.columns)

    let bestLines: PlacedLine[] = []
    let bestDiff = Infinity

    // Scan targets in half-lineHeight steps for finer granularity
    const step = Math.max(1, Math.round(this.lineHeight / 2))
    const scanStart = idealTarget - this.lineHeight * 6
    const scanEnd = idealTarget + this.lineHeight * 14
    for (let target = scanStart; target <= scanEnd; target += step) {
      const result = this.flowIntoColumns(columnWidth, target)
      const colHeights = this.getColumnHeights(result)

      // All columns must have content
      const filledCols = colHeights.filter(h => h > 0).length
      if (filledCols < this.columns) continue

      const maxH = Math.max(...colHeights)
      const minH = Math.min(...colHeights)
      const diff = maxH - minH

      if (diff < bestDiff) {
        bestDiff = diff
        bestLines = result
      }

      // Perfect — columns are equal
      if (diff === 0) break
    }

    // Fallback: if no result filled all columns, use simple target
    if (bestLines.length === 0) {
      bestLines = this.flowIntoColumns(columnWidth, idealTarget)
    }

    return bestLines
  }

  /** Flow all text into columns with the given target column height */
  private flowIntoColumns(columnWidth: number, targetColHeight: number): PlacedLine[] {
    const lines: PlacedLine[] = []
    let currentCol = 0
    let y = 0

    for (let pi = 0; pi < this.prepared.length; pi++) {
      const prepared = this.prepared[pi]
      const paraText = this.paragraphTexts[pi]
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
      let charOffset = 0

      for (;;) {
        // Column overflow
        if (y >= targetColHeight && currentCol < this.columns - 1) {
          currentCol++
          y = 0
        }

        const colX = this.containerPadding + currentCol * (columnWidth + this.columnGap)
        const slot = this.getLineSlot(colX, y, columnWidth)
        const line = layoutNextLine(prepared, cursor, slot.width)
        if (line === null) break

        lines.push({
          x: slot.x, y,
          text: line.text, width: line.width,
          paragraphIndex: pi,
          charStart: charOffset, charEnd: charOffset + line.text.length,
          column: currentCol,
        })

        charOffset += line.text.length
        while (charOffset < paraText.length && /\s/.test(paraText[charOffset])) charOffset++
        cursor = line.end
        y += this.lineHeight
      }
      y += this.paragraphGap
    }
    return lines
  }

  /** Get the bottom Y of each column from placed lines */
  private getColumnHeights(lines: PlacedLine[]): number[] {
    const heights = new Array(this.columns).fill(0)
    for (const line of lines) {
      const bottom = line.y + this.lineHeight
      if (bottom > heights[line.column]) heights[line.column] = bottom
    }
    return heights
  }

  /** Raw single-column layout without obstacles (for height estimation) */
  private layoutSingleColumnRaw(columnWidth: number): PlacedLine[] {
    const lines: PlacedLine[] = []
    let y = 0
    for (let pi = 0; pi < this.prepared.length; pi++) {
      const prepared = this.prepared[pi]
      const paraText = this.paragraphTexts[pi]
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
      let charOffset = 0
      for (;;) {
        const line = layoutNextLine(prepared, cursor, columnWidth)
        if (line === null) break
        lines.push({
          x: 0, y,
          text: line.text, width: line.width,
          paragraphIndex: pi,
          charStart: charOffset, charEnd: charOffset + line.text.length,
          column: 0,
        })
        charOffset += line.text.length
        while (charOffset < paraText.length && /\s/.test(paraText[charOffset])) charOffset++
        cursor = line.end
        y += this.lineHeight
      }
      y += this.paragraphGap
    }
    return lines
  }

  // --- Obstacle-aware line slot ---

  /** Scan-line intersection with a convex polygon at a given Y */
  private getPolygonXRangeAtY(
    polygon: { x: number; y: number }[], y: number,
  ): { left: number; right: number } | null {
    const intersections: number[] = []
    const n = polygon.length
    for (let i = 0; i < n; i++) {
      const a = polygon[i]
      const b = polygon[(i + 1) % n]
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        const t = (y - a.y) / (b.y - a.y)
        intersections.push(a.x + t * (b.x - a.x))
      }
    }
    if (intersections.length < 2) return null
    return { left: Math.min(...intersections), right: Math.max(...intersections) }
  }

  private getLineSlot(
    colX: number, lineY: number, colWidth: number,
  ): { x: number; width: number } {
    let left = colX
    let right = colX + colWidth

    for (const obs of this.obstacles) {
      const m = obs.margin ?? 0

      if (obs.polygon) {
        // Polygon contour: compute actual X range at this line's Y
        let polyLeft = Infinity, polyRight = -Infinity
        for (const sy of [lineY, lineY + this.lineHeight * 0.5, lineY + this.lineHeight]) {
          const range = this.getPolygonXRangeAtY(obs.polygon, sy)
          if (range) {
            polyLeft = Math.min(polyLeft, range.left)
            polyRight = Math.max(polyRight, range.right)
          }
        }
        if (polyLeft === Infinity) continue

        polyLeft -= m
        polyRight += m

        if (polyLeft <= left && polyRight >= right) continue
        if (polyLeft <= left) {
          left = Math.max(left, polyRight)
        } else if (polyRight >= right) {
          right = Math.min(right, polyLeft)
        } else {
          const leftSpace = polyLeft - left
          const rightSpace = right - polyRight
          if (leftSpace >= rightSpace) right = polyLeft
          else left = polyRight
        }
      } else {
        const oTop = obs.y - m
        const oBottom = obs.y + obs.height + m
        if (lineY + this.lineHeight <= oTop || lineY >= oBottom) continue

        const oLeft = obs.x - m
        const oRight = obs.x + obs.width + m

        if (oLeft <= left && oRight >= right) continue
        if (oLeft <= left) {
          left = Math.max(left, oRight)
        } else if (oRight >= right) {
          right = Math.min(right, oLeft)
        } else {
          const leftSpace = oLeft - left
          const rightSpace = right - oRight
          if (leftSpace >= rightSpace) right = oLeft
          else left = oRight
        }
      }
    }

    const width = right - left
    if (width < colWidth * 0.4) return { x: colX, width: colWidth }
    return { x: left, width }
  }

  // --- Map marks to line positions ---

  private computeHighlightSegments() {
    this.highlightSegments = []

    for (let mi = 0; mi < this.markDefs.length; mi++) {
      const mark = this.markDefs[mi]
      const segments: HighlightSegment[] = []

      for (const line of this.lines) {
        // Find phrase in this line's text
        const idx = line.text.indexOf(mark.phrase)
        if (idx === -1) {
          // Check for partial matches (mark spans across lines)
          // Start of mark: line ends with the beginning of the phrase
          // End of mark: line starts with the end of the phrase
          this.checkPartialMatch(mark, line, mi, segments)
          continue
        }

        // Full match within this line
        const beforeText = line.text.substring(0, idx)
        const xOffset = this.measureCtx.measureText(beforeText).width
        const markWidth = this.measureCtx.measureText(mark.phrase).width

        segments.push({
          x: line.x + xOffset,
          y: line.y,
          width: markWidth,
          height: this.lineHeight,
          markIndex: mi,
          isFirst: true,
          isLast: true,
        })
      }

      // If phrase wraps across lines, use character-offset based detection
      if (segments.length === 0) {
        this.findMarkByCharOffset(mark, mi, segments)
      }

      this.highlightSegments.push(...segments)
    }
  }

  private checkPartialMatch(
    mark: PretextMark, line: PlacedLine, markIndex: number,
    segments: HighlightSegment[],
  ) {
    // Check if line ends with the start of the phrase (min 4 chars to avoid false positives)
    for (let len = Math.min(4, mark.phrase.length); len < mark.phrase.length; len++) {
      const prefix = mark.phrase.substring(0, len)
      if (line.text.endsWith(prefix)) {
        const beforeText = line.text.substring(0, line.text.length - len)
        const xOffset = this.measureCtx.measureText(beforeText).width
        const markWidth = this.measureCtx.measureText(prefix).width

        segments.push({
          x: line.x + xOffset,
          y: line.y,
          width: markWidth,
          height: this.lineHeight,
          markIndex,
          isFirst: true,
          isLast: false,
        })
        return
      }
    }

    // Check if line starts with the end of the phrase (min 4 chars to avoid false positives)
    for (let len = Math.min(4, mark.phrase.length); len < mark.phrase.length; len++) {
      const suffix = mark.phrase.substring(mark.phrase.length - len)
      if (line.text.startsWith(suffix)) {
        const markWidth = this.measureCtx.measureText(suffix).width

        segments.push({
          x: line.x,
          y: line.y,
          width: markWidth,
          height: this.lineHeight,
          markIndex,
          isFirst: false,
          isLast: true,
        })
        return
      }
    }

    // Check if line is entirely within the phrase (middle lines)
    if (mark.phrase.includes(line.text.trim()) && line.text.trim().length > 3) {
      // Verify it's actually a middle segment by checking adjacent lines
      const markWidth = this.measureCtx.measureText(line.text).width
      segments.push({
        x: line.x,
        y: line.y,
        width: markWidth,
        height: this.lineHeight,
        markIndex,
        isFirst: false,
        isLast: false,
      })
    }
  }

  private findMarkByCharOffset(
    mark: PretextMark, markIndex: number,
    segments: HighlightSegment[],
  ) {
    // Build a running text from all lines in each paragraph to find phrase position
    const byPara = new Map<number, PlacedLine[]>()
    for (const line of this.lines) {
      let arr = byPara.get(line.paragraphIndex)
      if (!arr) { arr = []; byPara.set(line.paragraphIndex, arr) }
      arr.push(line)
    }

    for (const [_pi, paraLines] of byPara) {
      const fullText = paraLines.map(l => l.text).join(' ')
      const phraseIdx = fullText.indexOf(mark.phrase)
      if (phraseIdx === -1) continue

      const phraseEnd = phraseIdx + mark.phrase.length

      // Map character positions back to lines
      let charPos = 0
      for (let li = 0; li < paraLines.length; li++) {
        const line = paraLines[li]
        const lineStart = charPos
        const lineEnd = charPos + line.text.length

        // Check intersection
        if (phraseEnd <= lineStart || phraseIdx >= lineEnd) {
          charPos = lineEnd + 1 // +1 for the join space
          continue
        }

        const segStart = Math.max(0, phraseIdx - lineStart)
        const segEnd = Math.min(line.text.length, phraseEnd - lineStart)
        const segText = line.text.substring(segStart, segEnd)
        const beforeText = line.text.substring(0, segStart)

        const xOffset = this.measureCtx.measureText(beforeText).width
        const markWidth = this.measureCtx.measureText(segText).width

        segments.push({
          x: line.x + xOffset,
          y: line.y,
          width: markWidth,
          height: this.lineHeight,
          markIndex,
          isFirst: phraseIdx >= lineStart,
          isLast: phraseEnd <= lineEnd,
        })

        charPos = lineEnd + 1
      }
    }
  }

  // --- Rendering ---

  private render() {
    // Stop running animations
    this.stopAllAnimations()

    // Sync line pool
    this.syncLinePool(this.lines.length)
    for (let i = 0; i < this.lines.length; i++) {
      const el = this.linePool[i]
      const line = this.lines[i]
      el.style.left = `${line.x}px`
      el.style.top = `${line.y}px`
      el.style.font = this.font
      el.style.lineHeight = `${this.lineHeight}px`
      el.textContent = line.text
    }

    // Set container height to fit all content (use max Y across all columns)
    let maxY = 0
    for (const line of this.lines) {
      if (line.y > maxY) maxY = line.y
    }
    if (maxY > 0) {
      this.stage.style.height = `${maxY + this.lineHeight + 40}px`
    }

    // Remove old highlights
    for (const el of this.highlightPool) el.remove()
    this.highlightPool = []
    this.renderers = []
    this.animationFrameIds = []

    // Create highlights
    for (let si = 0; si < this.highlightSegments.length; si++) {
      const seg = this.highlightSegments[si]
      const mark = this.markDefs[seg.markIndex]

      // Merge options: defaults → style → per-mark
      const styleOpts = mark.style ? PretextHighlighter.getStyle(mark.style) : {}
      const markOpts = mark.options || {}
      const merged = this.validator.validate({
        ...this.options,
        ...styleOpts,
        ...markOpts,
        ...(mark.drawingMode ? { drawingMode: mark.drawingMode } : {}),
      })

      const color = new Color(mark.color || '#FDD835')
      const skipAnimation = merged.animate === false
      const virtualRect = new VirtualRect(
        seg.x, seg.y, seg.width, seg.height,
        !seg.isFirst, !seg.isLast,
      )

      try {
        const renderer = RendererFactory.getRenderer({
          mode: merged.drawingMode,
          options: merged,
          color,
          rect: virtualRect as any,
        })

        this.renderers.push(renderer)

        const bounds: DrawResult = renderer.setBounds()
        const highlightDiv = document.createElement('div')
        highlightDiv.className = 'highlight pretext-highlight'
        highlightDiv.dataset.segIdx = String(si)
        highlightDiv.appendChild(bounds.canvas)

        const positionOffset = merged.offset * seg.height / 2
        let hv = bounds.verticalOffset + seg.height * 0.1

        highlightDiv.style.position = 'absolute'
        highlightDiv.style.top = `${seg.y - hv + positionOffset}px`
        highlightDiv.style.left = `${seg.x - bounds.horizontalPadding}px`
        highlightDiv.style.width = `${seg.width + 2 * bounds.horizontalPadding}px`
        highlightDiv.style.height = `${Math.max(seg.height, bounds.height)}px`
        highlightDiv.style.pointerEvents = 'none'
        highlightDiv.style.zIndex = '1'

        if (merged.skewX || merged.skewY) {
          const sx = (merged.skewX || 0) * seg.height
          const sy = (merged.skewY || 0) * seg.height
          highlightDiv.style.transform = `skew(${sx}deg, ${sy}deg)`
          highlightDiv.style.transformOrigin = 'center'
        }

        if (this.options.debug) {
          highlightDiv.style.border = '1px dashed red'
        }

        this.stage.appendChild(highlightDiv)
        this.highlightPool.push(highlightDiv)

        // Animation — skip for marks already shown (persists across resize)
        const alreadyShown = this.shownMarks.has(seg.markIndex)
        if (alreadyShown) {
          this.startAnimation(si, true)
        } else if (merged.animationTrigger === 'scrollIntoView') {
          this.observer?.observe(highlightDiv)
        } else {
          const delay = (merged.delay || 0) + (merged.multiLineDelay || 0) * si * merged.animationSpeed
          setTimeout(() => this.startAnimation(si, skipAnimation), delay)
        }

      } catch (e) {
        console.error('PretextHighlighter: renderer error', e)
      }
    }
  }

  private startAnimation(segmentIndex: number, skip: boolean) {
    const renderer = this.renderers[segmentIndex]
    if (!renderer) return

    // Track that this mark has been shown (survives resize)
    const seg = this.highlightSegments[segmentIndex]
    if (seg) this.shownMarks.add(seg.markIndex)

    renderer.startAnimation(skip)

    if (!skip) {
      const animate = (ts: number) => {
        if (renderer.animate(ts)) {
          this.animationFrameIds[segmentIndex] = requestAnimationFrame(animate)
        } else {
          this.animationFrameIds[segmentIndex] = 0
        }
      }
      this.animationFrameIds[segmentIndex] = requestAnimationFrame(animate)
    }
  }

  private stopAllAnimations() {
    for (const id of this.animationFrameIds) {
      if (id) cancelAnimationFrame(id)
    }
    this.animationFrameIds = []
  }

  // --- Line pool management ---

  private syncLinePool(count: number) {
    while (this.linePool.length < count) {
      const el = document.createElement('div')
      el.className = 'pretext-line'
      el.style.position = 'absolute'
      el.style.whiteSpace = 'pre'
      el.style.zIndex = '3'
      this.stage.appendChild(el)
      this.linePool.push(el)
    }
    for (let i = 0; i < this.linePool.length; i++) {
      this.linePool[i].style.display = i < count ? '' : 'none'
    }
  }

  // --- Resize ---

  private handleResize = () => {
    const w = this.container.clientWidth
    if (w === this.lastContainerWidth) return
    this.lastContainerWidth = w

    if (this.resizeRafId) cancelAnimationFrame(this.resizeRafId)
    this.resizeRafId = requestAnimationFrame(() => {
      this.relayout()
      this.resizeRafId = null
    })
  }
}
