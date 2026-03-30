import { PretextHighlighter } from './PretextHighlighter'
import type { PretextMark, PretextObstacle, PretextMetrics } from './PretextHighlighter'
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
  cx: number, cy: number, outerR: number, innerR: number, points = 5, angleDeg = 0, n?: number,
): { x: number; y: number }[] {
  const rot = angleDeg * Math.PI / 180
  const totalPoints = n ?? points * 2
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

// Page 1 shapes: circle + star (darker, solid, bright borders)
const PAGE1_SHAPES: ShapeDef[] = [
  {
    id: 'solid-circle',
    svg: `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="110" cy="110" r="100" fill="#E5393520" stroke="#E53935" stroke-width="10"/>
    </svg>`,
    width: 220,
    height: 220,
    xFraction: 0.28,
    topFraction: 0.30,
    rotation: 0,
    contourType: 'circle',
  },
  {
    id: 'big-star',
    svg: `<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
      <polygon points="130,10 159.4,89.5 244.1,92.9 177.6,145.5 200.5,227.1 130,180 59.5,227.1 82.4,145.5 15.9,92.9 100.6,89.5" fill="#1E88E520" stroke="#1E88E5" stroke-width="10" stroke-linejoin="round"/>
    </svg>`,
    width: 260,
    height: 260,
    xFraction: 0.72,
    topFraction: 0.55,
    rotation: 12,
    contourType: 'star',
  },
]

// --- Article text (all paragraphs, distributed across pages) ---
const ALL_PARAGRAPHS = [
  // Page 1 (3 cols, 2 shapes)
  `The practice of highlighting important passages has ancient roots that stretch back to the earliest days of written language. Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication to guide readers through dense theological texts. Red ink, derived from cinnabar or vermillion pigments, was used to mark chapter headings and significant passages — giving us the word "rubric" from the Latin rubrica, meaning red earth.`,

  `The illuminated manuscripts of the twelfth and thirteenth centuries elevated this practice into high art. Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty. A single decorated initial might take days to complete, its intricate knotwork and miniature scenes serving simultaneously as decoration and as a visual anchor that helped readers navigate through dense columns of carefully lettered text. The marriage of utility and beauty was seamless.`,

  `The modern fluorescent highlighter arrived remarkably late in this long history. Carter's Ink Company introduced the Hi-Liter in 1963, using a water-based fluorescent ink that could overlay printed text without obscuring it. The luminous yellow became instantly iconic — chosen not by accident but by careful design, because it was clearly visible on the page yet would not reproduce when photocopied, preserving the clean appearance of shared documents.`,

  // Page 2 (2 cols, larger text)
  `Today, digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical to medieval scribes. On screens, highlighted text can be animated, layered with transparency, and styled with effects that echo the organic imperfection of a real pen stroke. A marker effect drawn on canvas can ripple with wavering edges and variable opacity, carrying an unmistakable echo of the human hand across centuries of practice.`,

  `Libraries like pretext solve this through pure arithmetic — computing text layout independently of the browser's rendering engine, using cached font metrics to determine exactly where each line should break. Text flows around photographs and illustrations with a precision that CSS alone cannot achieve, while maintaining the performance needed for smooth interaction and real-time reflow on every resize.`,

  // Page 3 (3 cols 1fr-2fr-1fr)
  `When combined with canvas-based highlighting, the result is something genuinely new: a reading experience that feels both unmistakably modern and deeply connected to centuries of marked text. The wavering line of a digital highlighter, imperfect by careful design, carries forward something essential from those first red marks made by candlelight in a medieval monastery — the simple human impulse to say: this matters, remember this.`,

  `The performance implications of this approach are striking. Where traditional DOM-based highlighting requires expensive layout reflows — each call to getClientRects() forces the browser to recalculate the position of every element — pretext's arithmetic layout runs in microseconds. A resize that might take fifty milliseconds with DOM measurement completes in under a tenth of a millisecond. The text snaps into place. The highlights follow instantly.`,

  // Page 4
  `This speed opens new possibilities. Text can reflow continuously during window resizing, not in jerky debounced steps. Highlights can track dynamically changing content without visible lag. Multiple columns of flowing text — something that pushes CSS to its limits — become trivial when layout is just arithmetic on cached measurements. The constraints that once shaped digital typography begin to dissolve.`,
]

// --- Marks per page ---
const PAGE1_MARKS: PretextMark[] = [
  {
    phrase: 'Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication',
    color: '#FDD835',
    drawingMode: 'highlight',
    options: { animationSpeed: 1000, height: 1, highlight: { amplitude: 0.2, wavelength: 5, roughEnds: 2 } },
  },
  {
    phrase: 'Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty',
    color: '#FFE082',
    drawingMode: 'highlight',
    options: { animationSpeed: 900, height: 1, highlight: { amplitude: 0.15, wavelength: 3, roughEnds: 1 } },
  },
  {
    phrase: 'red earth',
    color: '#EF5350',
    drawingMode: 'circle',
    options: { animationSpeed: 800, circle: { curve: 0.6, wobble: 0.35, loops: 3, thickness: 2.5 } },
  },
  {
    phrase: 'The luminous yellow became instantly iconic',
    color: '#FFF176',
    drawingMode: 'highlight',
    options: { animationSpeed: 650, height: 1, highlight: { amplitude: 0.25, wavelength: 4, roughEnds: 1.5 } },
  },
]

const PAGE2_MARKS: PretextMark[] = [
  {
    phrase: 'digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical',
    color: '#FFD54F',
    drawingMode: 'highlight',
    options: { animationSpeed: 1100, height: 1, highlight: { amplitude: 0.18, wavelength: 6, roughEnds: 2 } },
  },
  {
    phrase: 'organic imperfection',
    color: '#EF5350',
    drawingMode: 'circle',
    options: { animationSpeed: 750, circle: { curve: 0.7, wobble: 0.4, loops: 3, thickness: 2.5 } },
  },
  {
    phrase: 'pure arithmetic',
    color: '#81C784',
    drawingMode: 'scribble',
    options: { animationSpeed: 550 },
  },
  {
    phrase: 'cached font metrics',
    color: '#42A5F5',
    drawingMode: 'sketchout',
    options: { animationSpeed: 750 },
  },
]

const PAGE3_MARKS: PretextMark[] = [
  {
    phrase: 'this matters, remember this',
    color: '#66BB6A',
    drawingMode: 'scribble',
    options: { animationSpeed: 700 },
  },
  {
    phrase: 'runs in microseconds',
    color: '#64B5F6',
    drawingMode: 'sketchout',
    options: { animationSpeed: 650 },
  },
  {
    phrase: 'genuinely new',
    color: '#E57373',
    drawingMode: 'circle',
    options: { animationSpeed: 1000, circle: { curve: 0.5, wobble: 0.3, loops: 2, thickness: 2 } },
  },
  {
    phrase: 'The text snaps into place',
    color: '#FDD835',
    drawingMode: 'highlight',
    options: { animationSpeed: 800, height: 1, highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 } },
  },
]

const PAGE4_MARKS: PretextMark[] = [
  {
    phrase: 'constraints that once shaped digital typography begin to dissolve',
    color: '#42A5F5',
    drawingMode: 'sketchout',
    options: { animationSpeed: 900 },
  },
  {
    phrase: 'Text can reflow continuously',
    color: '#FDD835',
    drawingMode: 'highlight',
    options: { animationSpeed: 800, height: 1, highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 } },
  },
  {
    phrase: 'just arithmetic on cached measurements',
    color: '#66BB6A',
    drawingMode: 'scribble',
    options: { animationSpeed: 600 },
  },
]

// --- Metrics display ---
const allMetrics: PretextMetrics[] = [
  { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 },
  { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 },
  { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 },
  { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 },
]

function updateMetricsDisplay() {
  const el = document.getElementById('metrics')
  if (!el) return
  const total = allMetrics.reduce((acc, m) => ({
    prepareMs: acc.prepareMs + m.prepareMs,
    layoutMs: acc.layoutMs + m.layoutMs,
    renderMs: acc.renderMs + m.renderMs,
    lineCount: acc.lineCount + m.lineCount,
    paragraphCount: acc.paragraphCount + m.paragraphCount,
  }), { prepareMs: 0, layoutMs: 0, renderMs: 0, lineCount: 0, paragraphCount: 0 })

  el.innerHTML = `
    <span>prepare: <strong>${total.prepareMs.toFixed(1)}ms</strong></span>
    <span>layout: <strong>${total.layoutMs.toFixed(2)}ms</strong></span>
    <span>render: <strong>${total.renderMs.toFixed(1)}ms</strong></span>
    <span>${total.lineCount} lines across ${total.paragraphCount} paragraphs, 4 pages</span>
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
  const margin = 12

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
      left: ${shapeX}px;
      top: ${shapeY}px;
      width: ${shape.width}px;
      height: ${shape.height}px;
      pointer-events: none;
      z-index: 2;
      ${shape.rotation ? `transform: rotate(${shape.rotation}deg); transform-origin: center center;` : ''}
    `
    container.appendChild(wrapper)
    elements.push(wrapper)

    let polygon: { x: number; y: number }[]
    if (shape.contourType === 'circle') {
      polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
    } else if (shape.contourType === 'rect') {
      polygon = rotatedRectPolygon(cx, cy, shape.width, shape.height, shape.rotation)
    } else if (shape.contourType === 'star') {
      polygon = starPolygon(cx, cy, Math.min(shape.width, shape.height) / 2, Math.min(shape.width, shape.height) / 4.5, 5, shape.rotation)
    } else {
      polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
    }

    obstacles.push({
      x: shapeX, y: shapeY,
      width: shape.width, height: shape.height,
      margin, polygon,
    })
  }

  return { obstacles, elements }
}

// --- Non-pretext section (traditional MarkerHighlighter) ---
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

  const highlighters: PretextHighlighter[] = []

  // ===== PAGE 1: 3 columns, 2 shapes, standard text =====
  const page1 = document.getElementById('page-1-inner') as HTMLDivElement
  if (page1) {
    const w = page1.clientWidth
    const h = page1.clientHeight
    const { obstacles } = placeShapes(page1, PAGE1_SHAPES, w, h)

    const hl = new PretextHighlighter(page1, {
      font: '20px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 31,
      containerPadding: 0,
      columns: 3,
      columnGap: 36,
      paragraphs: ALL_PARAGRAPHS.slice(0, 3),
      marks: PAGE1_MARKS,
      obstacles,
      animate: true,
      animationSpeed: 800,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: (m) => { allMetrics[0] = m; updateMetricsDisplay() },
    })
    highlighters.push(hl)
  }

  // ===== PAGE 2: 2 columns, larger text =====
  const page2 = document.getElementById('page-2-inner') as HTMLDivElement
  if (page2) {
    const hl = new PretextHighlighter(page2, {
      font: '24px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 38,
      containerPadding: 0,
      columns: 2,
      columnGap: 48,
      paragraphs: ALL_PARAGRAPHS.slice(3, 5),
      marks: PAGE2_MARKS,
      animate: true,
      animationSpeed: 900,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: (m) => { allMetrics[1] = m; updateMetricsDisplay() },
    })
    highlighters.push(hl)
  }

  // ===== PAGE 3: 3 columns (1fr 2fr 1fr) — simulated via single column with manual split =====
  // PretextHighlighter doesn't support variable column widths natively,
  // so we use 3 separate instances side by side
  const page3 = document.getElementById('page-3-inner') as HTMLDivElement
  if (page3) {
    const totalW = page3.clientWidth
    const gap = 32
    const sideW = (totalW - gap * 2) / 4       // 1fr
    const centerW = (totalW - gap * 2) / 2     // 2fr

    // Left column container
    const leftDiv = document.createElement('div')
    leftDiv.style.cssText = `position: absolute; left: 0; top: 0; width: ${sideW}px; height: 100%;`
    page3.appendChild(leftDiv)

    const hlLeft = new PretextHighlighter(leftDiv, {
      font: '17px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 27,
      containerPadding: 0,
      columns: 1,
      paragraphs: [ALL_PARAGRAPHS[5]],
      marks: PAGE3_MARKS.filter(m => ALL_PARAGRAPHS[5].includes(m.phrase)),
      animate: true,
      animationSpeed: 800,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: (m) => { allMetrics[2] = m; updateMetricsDisplay() },
    })
    highlighters.push(hlLeft)

    // Center column container
    const centerDiv = document.createElement('div')
    centerDiv.style.cssText = `position: absolute; left: ${sideW + gap}px; top: 0; width: ${centerW}px; height: 100%;`
    page3.appendChild(centerDiv)

    const hlCenter = new PretextHighlighter(centerDiv, {
      font: '24px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 38,
      containerPadding: 0,
      columns: 1,
      paragraphs: [ALL_PARAGRAPHS[5], ALL_PARAGRAPHS[6]],
      marks: PAGE3_MARKS,
      animate: true,
      animationSpeed: 900,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: () => {},
    })
    highlighters.push(hlCenter)

    // Right column container
    const rightDiv = document.createElement('div')
    rightDiv.style.cssText = `position: absolute; left: ${sideW + gap + centerW + gap}px; top: 0; width: ${sideW}px; height: 100%;`
    page3.appendChild(rightDiv)

    const hlRight = new PretextHighlighter(rightDiv, {
      font: '17px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 27,
      containerPadding: 0,
      columns: 1,
      paragraphs: [ALL_PARAGRAPHS[6]],
      marks: PAGE3_MARKS.filter(m => ALL_PARAGRAPHS[6].includes(m.phrase)),
      animate: true,
      animationSpeed: 800,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: () => {},
    })
    highlighters.push(hlRight)
  }

  // ===== PAGE 4: 2 columns, large text, tilted rectangle obstacle =====
  const page4 = document.getElementById('page-4-inner') as HTMLDivElement
  if (page4) {
    const page4Shapes: ShapeDef[] = [{
      id: 'tilted-rect',
      svg: `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="190" height="150" fill="#43A04720" stroke="#43A047" stroke-width="10"/>
      </svg>`,
      width: 200,
      height: 160,
      xFraction: 0.35,
      topFraction: 0.45,
      rotation: -8,
      contourType: 'rect',
    }]

    const w4 = page4.clientWidth
    const h4 = page4.clientHeight
    const { obstacles: obs4 } = placeShapes(page4, page4Shapes, w4, h4)

    const hl = new PretextHighlighter(page4, {
      font: '26px "Source Serif 4", Georgia, "Times New Roman", serif',
      lineHeight: 42,
      containerPadding: 0,
      columns: 2,
      columnGap: 44,
      paragraphs: [ALL_PARAGRAPHS[7]],
      marks: PAGE4_MARKS,
      obstacles: obs4,
      animate: true,
      animationSpeed: 1000,
      multiLineDelay: 150,
      animationTrigger: 'scrollIntoView',
      padding: 0.12,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
      onLayout: (m) => { allMetrics[3] = m; updateMetricsDisplay() },
    })
    highlighters.push(hl)
  }

  // Init traditional section
  initTraditionalSection()
})()
