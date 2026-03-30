import { PretextHighlighter } from './PretextHighlighter'
import type { PretextMark, PretextObstacle, PretextMetrics, FlowPosition } from './PretextHighlighter'
import { MarkerHighlighter } from './MarkerHighlighter'

// --- Polygon helpers for contour-based text nestling ---
function circlePolygon(cx: number, cy: number, r: number, n = 24): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

function rotatedRectPolygon(
  cx: number, cy: number, w: number, h: number, angleDeg: number,
): { x: number; y: number }[] {
  const a = angleDeg * Math.PI / 180
  const cos = Math.cos(a), sin = Math.sin(a)
  const hw = w / 2, hh = h / 2
  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  return corners.map(([px, py]) => ({
    x: cx + px * cos - py * sin,
    y: cy + px * sin + py * cos,
  }))
}

function starPolygon(
  cx: number, cy: number, outerR: number, innerR: number, points = 5, angleDeg = 0,
): { x: number; y: number }[] {
  const rot = angleDeg * Math.PI / 180
  const totalPoints = points * 2
  return Array.from({ length: totalPoints }, (_, i) => {
    const a = (i / totalPoints) * 2 * Math.PI - Math.PI / 2 + rot
    const r = i % 2 === 0 ? outerR : innerR
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

// --- SVG shape definitions ---
interface ShapeDef {
  id: string
  svg: string
  width: number
  height: number
  xFraction: number
  topFraction: number
  rotation: number
  contourType: 'circle' | 'rect' | 'star'
}

const PAGE1_SHAPES: ShapeDef[] = [
  {
    id: 'solid-circle',
    svg: `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="110" cy="110" r="100" fill="#E5393520" stroke="#E53935" stroke-width="10"/>
    </svg>`,
    width: 220, height: 220,
    xFraction: 0.28, topFraction: 0.30, rotation: 0, contourType: 'circle',
  },
  {
    id: 'big-star',
    svg: `<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
      <polygon points="130,10 159.4,89.5 244.1,92.9 177.6,145.5 200.5,227.1 130,180 59.5,227.1 82.4,145.5 15.9,92.9 100.6,89.5" fill="#1E88E520" stroke="#1E88E5" stroke-width="10" stroke-linejoin="round"/>
    </svg>`,
    width: 260, height: 260,
    xFraction: 0.72, topFraction: 0.55, rotation: 12, contourType: 'star',
  },
]

const PAGE4_SHAPES: ShapeDef[] = [
  {
    id: 'tilted-rect',
    svg: `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="190" height="150" fill="#43A04720" stroke="#43A047" stroke-width="10"/>
    </svg>`,
    width: 200, height: 160,
    xFraction: 0.35, topFraction: 0.45, rotation: -8, contourType: 'rect',
  },
]

// --- Article text (continuous stream) ---
const ALL_PARAGRAPHS = [
  `The practice of highlighting important passages has ancient roots that stretch back to the earliest days of written language. Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication to guide readers through dense theological texts. Red ink, derived from cinnabar or vermillion pigments, was used to mark chapter headings and significant passages — giving us the word "rubric" from the Latin rubrica, meaning red earth. These marks were functional, precise, and deeply intentional.`,

  `The illuminated manuscripts of the twelfth and thirteenth centuries elevated this practice into high art. Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty. A single decorated initial might take days to complete, its intricate knotwork and miniature scenes serving simultaneously as decoration and as a visual anchor that helped readers navigate through dense columns of carefully lettered text. The marriage of utility and beauty was seamless.`,

  `The modern fluorescent highlighter arrived remarkably late in this long history. Carter's Ink Company introduced the Hi-Liter in 1963, using a water-based fluorescent ink that could overlay printed text without obscuring it. The luminous yellow became instantly iconic — chosen not by accident but by careful design, because it was clearly visible on the page yet would not reproduce when photocopied, preserving the clean appearance of shared documents.`,

  `Today, digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical to medieval scribes. On screens, highlighted text can be animated, layered with transparency, and styled with effects that echo the organic imperfection of a real pen stroke. A marker effect drawn on canvas can ripple with wavering edges and variable opacity, carrying an unmistakable echo of the human hand across centuries of practice.`,

  `Libraries like pretext solve this through pure arithmetic — computing text layout independently of the browser's rendering engine, using cached font metrics to determine exactly where each line should break. Text flows around photographs and illustrations with a precision that CSS alone cannot achieve, while maintaining the performance needed for smooth interaction and real-time reflow on every resize.`,

  `When combined with canvas-based highlighting, the result is something genuinely new: a reading experience that feels both unmistakably modern and deeply connected to centuries of marked text. The wavering line of a digital highlighter, imperfect by careful design, carries forward something essential from those first red marks made by candlelight in a medieval monastery — the simple human impulse to say: this matters, remember this.`,

  `The performance implications of this approach are striking. Where traditional DOM-based highlighting requires expensive layout reflows — each call to getClientRects() forces the browser to recalculate the position of every element — pretext's arithmetic layout runs in microseconds. A resize that might take fifty milliseconds with DOM measurement completes in under a tenth of a millisecond. The text snaps into place. The highlights follow instantly.`,

  `This speed opens new possibilities. Text can reflow continuously during window resizing, not in jerky debounced steps. Highlights can track dynamically changing content without visible lag. Multiple columns of flowing text — something that pushes CSS to its limits — become trivial when layout is just arithmetic on cached measurements. The constraints that once shaped digital typography begin to dissolve.`,
]

// --- All marks (passed to every page — only render where phrase appears) ---
const ALL_MARKS: PretextMark[] = [
  // Highlight (yellow marker)
  {
    phrase: 'Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication',
    color: '#FDD835', drawingMode: 'highlight',
    options: { animationSpeed: 1000, height: 1, highlight: { amplitude: 0.2, wavelength: 5, roughEnds: 2 } },
  },
  {
    phrase: 'Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty',
    color: '#FFE082', drawingMode: 'highlight',
    options: { animationSpeed: 900, height: 1, highlight: { amplitude: 0.15, wavelength: 3, roughEnds: 1 } },
  },
  {
    phrase: 'The luminous yellow became instantly iconic',
    color: '#FFF176', drawingMode: 'highlight',
    options: { animationSpeed: 650, height: 1, highlight: { amplitude: 0.25, wavelength: 4, roughEnds: 1.5 } },
  },
  {
    phrase: 'digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical',
    color: '#FFD54F', drawingMode: 'highlight',
    options: { animationSpeed: 1100, height: 1, highlight: { amplitude: 0.18, wavelength: 6, roughEnds: 2 } },
  },
  {
    phrase: 'Text can reflow continuously',
    color: '#FDD835', drawingMode: 'highlight',
    options: { animationSpeed: 800, height: 1, highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 } },
  },
  {
    phrase: 'The text snaps into place',
    color: '#FFE082', drawingMode: 'highlight',
    options: { animationSpeed: 700, height: 1, highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 } },
  },

  // Circle (red hand-drawn)
  {
    phrase: 'red earth',
    color: '#EF5350', drawingMode: 'circle',
    options: { animationSpeed: 800, circle: { curve: 0.6, wobble: 0.35, loops: 3, thickness: 2.5 } },
  },
  {
    phrase: 'organic imperfection',
    color: '#EF5350', drawingMode: 'circle',
    options: { animationSpeed: 750, circle: { curve: 0.7, wobble: 0.4, loops: 3, thickness: 2.5 } },
  },
  {
    phrase: 'genuinely new',
    color: '#E57373', drawingMode: 'circle',
    options: { animationSpeed: 1000, circle: { curve: 0.5, wobble: 0.3, loops: 2, thickness: 2 } },
  },

  // Scribble (green)
  {
    phrase: 'this matters, remember this',
    color: '#66BB6A', drawingMode: 'scribble',
    options: { animationSpeed: 700 },
  },
  {
    phrase: 'pure arithmetic',
    color: '#81C784', drawingMode: 'scribble',
    options: { animationSpeed: 550 },
  },
  {
    phrase: 'just arithmetic on cached measurements',
    color: '#66BB6A', drawingMode: 'scribble',
    options: { animationSpeed: 600 },
  },

  // Sketchout (blue)
  {
    phrase: 'cached font metrics',
    color: '#42A5F5', drawingMode: 'sketchout',
    options: { animationSpeed: 750 },
  },
  {
    phrase: 'runs in microseconds',
    color: '#64B5F6', drawingMode: 'sketchout',
    options: { animationSpeed: 650 },
  },
  {
    phrase: 'constraints that once shaped digital typography begin to dissolve',
    color: '#42A5F5', drawingMode: 'sketchout',
    options: { animationSpeed: 900 },
  },
]

// --- Metrics display ---
const allMetrics: PretextMetrics[] = Array.from({ length: 4 }, () => (
  { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 }
))

function updateMetricsDisplay() {
  const el = document.getElementById('metrics')
  if (!el) return
  const t = allMetrics.reduce((a, m) => ({
    prepareMs: a.prepareMs + m.prepareMs,
    layoutMs: a.layoutMs + m.layoutMs,
    renderMs: a.renderMs + m.renderMs,
    lineCount: a.lineCount + m.lineCount,
    paragraphCount: a.paragraphCount + m.paragraphCount,
  }), { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 })

  el.innerHTML = `
    <span>prepare: <strong>${t.prepareMs.toFixed(1)}ms</strong></span>
    <span>layout: <strong>${t.layoutMs.toFixed(2)}ms</strong></span>
    <span>render: <strong>${t.renderMs.toFixed(1)}ms</strong></span>
    <span>${t.lineCount} lines, 4 pages</span>
  `
}

// --- Shape placement helper ---
function placeShapes(
  container: HTMLElement,
  shapes: ShapeDef[],
  containerWidth: number,
  containerHeight: number,
): { obstacles: PretextObstacle[], elements: HTMLElement[] } {
  const obstacles: PretextObstacle[] = []
  const elements: HTMLElement[] = []

  for (const shape of shapes) {
    const cx = shape.xFraction * containerWidth
    const cy = shape.topFraction * containerHeight
    const shapeX = cx - shape.width / 2
    const shapeY = cy - shape.height / 2

    const wrapper = document.createElement('div')
    wrapper.className = 'svg-shape'
    wrapper.innerHTML = shape.svg
    wrapper.style.cssText = `
      position: absolute;
      left: ${shapeX}px; top: ${shapeY}px;
      width: ${shape.width}px; height: ${shape.height}px;
      pointer-events: none; z-index: 2;
      ${shape.rotation ? `transform: rotate(${shape.rotation}deg); transform-origin: center center;` : ''}
    `
    container.appendChild(wrapper)
    elements.push(wrapper)

    let polygon: { x: number; y: number }[]
    if (shape.contourType === 'circle') {
      polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
    } else if (shape.contourType === 'rect') {
      polygon = rotatedRectPolygon(cx, cy, shape.width, shape.height, shape.rotation)
    } else {
      polygon = starPolygon(cx, cy, Math.min(shape.width, shape.height) / 2, Math.min(shape.width, shape.height) / 4.5, 5, shape.rotation)
    }

    obstacles.push({
      x: shapeX, y: shapeY,
      width: shape.width, height: shape.height,
      margin: 12, polygon,
    })
  }

  return { obstacles, elements }
}

function repositionShapes(
  shapes: ShapeDef[],
  elements: HTMLElement[],
  containerWidth: number,
  containerHeight: number,
): PretextObstacle[] {
  const obstacles: PretextObstacle[] = []
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]
    const cx = shape.xFraction * containerWidth
    const cy = shape.topFraction * containerHeight
    const shapeX = cx - shape.width / 2
    const shapeY = cy - shape.height / 2

    elements[i].style.left = `${shapeX}px`
    elements[i].style.top = `${shapeY}px`

    let polygon: { x: number; y: number }[]
    if (shape.contourType === 'circle') {
      polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
    } else if (shape.contourType === 'rect') {
      polygon = rotatedRectPolygon(cx, cy, shape.width, shape.height, shape.rotation)
    } else {
      polygon = starPolygon(cx, cy, Math.min(shape.width, shape.height) / 2, Math.min(shape.width, shape.height) / 4.5, 5, shape.rotation)
    }

    obstacles.push({
      x: shapeX, y: shapeY,
      width: shape.width, height: shape.height,
      margin: 12, polygon,
    })
  }
  return obstacles
}

// --- Non-pretext section ---
function initTraditionalSection() {
  const section = document.getElementById('traditional-section')
  if (!section) return
  new MarkerHighlighter(section, {
    animationSpeed: 1800,
    animationTrigger: 'scrollIntoView',
    padding: 0.15,
    height: 1,
    highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
  })
}

// --- Main ---
;(async () => {
  await document.fonts.ready

  const page1El = document.getElementById('page-1-inner') as HTMLDivElement
  const page2El = document.getElementById('page-2-inner') as HTMLDivElement
  const page3El = document.getElementById('page-3-inner') as HTMLDivElement
  const page4El = document.getElementById('page-4-inner') as HTMLDivElement

  if (!page1El || !page2El || !page3El || !page4El) return

  const defaultOpts = {
    paragraphs: ALL_PARAGRAPHS,
    marks: ALL_MARKS,
    animate: true,
    multiLineDelay: 150,
    animationTrigger: 'scrollIntoView',
    padding: 0.12,
    height: 1,
    highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
    autoResize: false,
  }

  // ===== PAGE 1: 3 columns, 2 shapes =====
  const p1w = page1El.clientWidth
  const p1h = page1El.clientHeight
  const { obstacles: obs1, elements: shapeEls1 } = placeShapes(page1El, PAGE1_SHAPES, p1w, p1h)

  const hl1 = new PretextHighlighter(page1El, {
    ...defaultOpts,
    font: '20px "Source Serif 4", Georgia, "Times New Roman", serif',
    lineHeight: 31,
    containerPadding: 0,
    columns: 3,
    columnGap: 36,
    obstacles: obs1,
    maxHeight: p1h,
    animationSpeed: 800,
    onLayout: (m) => { allMetrics[0] = m; updateMetricsDisplay() },
  })

  // ===== PAGE 2: 2 columns, larger text =====
  const hl2 = new PretextHighlighter(page2El, {
    ...defaultOpts,
    font: '24px "Source Serif 4", Georgia, "Times New Roman", serif',
    lineHeight: 38,
    containerPadding: 0,
    columns: 2,
    columnGap: 48,
    maxHeight: page2El.clientHeight,
    startFrom: hl1.flowStopPosition!,
    animationSpeed: 900,
    onLayout: (m) => { allMetrics[1] = m; updateMetricsDisplay() },
  })

  // ===== PAGE 3: 3 columns (1fr 2fr 1fr) =====
  const p3w = page3El.clientWidth
  const p3gap = 32
  const p3side = (p3w - p3gap * 2) / 4
  const p3center = (p3w - p3gap * 2) / 2

  const hl3 = new PretextHighlighter(page3El, {
    ...defaultOpts,
    font: '20px "Source Serif 4", Georgia, "Times New Roman", serif',
    lineHeight: 31,
    containerPadding: 0,
    columns: 3,
    columnGap: p3gap,
    columnWidths: [p3side, p3center, p3side],
    maxHeight: page3El.clientHeight,
    startFrom: hl2.flowStopPosition!,
    animationSpeed: 800,
    onLayout: (m) => { allMetrics[2] = m; updateMetricsDisplay() },
  })

  // ===== PAGE 4: 2 columns, obstacle, natural end =====
  const p4w = page4El.clientWidth
  const p4h = page4El.clientHeight
  const { obstacles: obs4, elements: shapeEls4 } = placeShapes(page4El, PAGE4_SHAPES, p4w, p4h)

  const hl4 = new PretextHighlighter(page4El, {
    ...defaultOpts,
    font: '26px "Source Serif 4", Georgia, "Times New Roman", serif',
    lineHeight: 42,
    containerPadding: 0,
    columns: 2,
    columnGap: 44,
    obstacles: obs4,
    startFrom: hl3.flowStopPosition!,
    animationSpeed: 1000,
    onLayout: (m) => { allMetrics[3] = m; updateMetricsDisplay() },
  })

  // --- Resize: cascade all pages ---
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      // Page 1: reposition shapes + relayout
      const newObs1 = repositionShapes(PAGE1_SHAPES, shapeEls1, page1El.clientWidth, page1El.clientHeight)
      hl1.setObstacles(newObs1)

      // Page 2: cascade from page 1
      const stop1 = hl1.flowStopPosition
      if (stop1) hl2.setStartFrom(stop1)

      // Page 3: update column widths + cascade from page 2
      const stop2 = hl2.flowStopPosition
      if (stop2) {
        const newP3w = page3El.clientWidth
        const newSide = (newP3w - p3gap * 2) / 4
        const newCenter = (newP3w - p3gap * 2) / 2
        hl3.update({ startFrom: stop2, columnWidths: [newSide, newCenter, newSide] })
      }

      // Page 4: reposition shapes + cascade from page 3
      const stop3 = hl3.flowStopPosition
      if (stop3) {
        const newObs4 = repositionShapes(PAGE4_SHAPES, shapeEls4, page4El.clientWidth, page4El.clientHeight)
        hl4.update({ startFrom: stop3, obstacles: newObs4 })
      }
    }, 100)
  })

  // Init traditional section
  initTraditionalSection()
})()
