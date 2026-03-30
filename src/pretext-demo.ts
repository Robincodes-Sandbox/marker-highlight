import { PretextHighlighter } from './PretextHighlighter'
import type { PretextMark, PretextObstacle, PretextMetrics } from './PretextHighlighter'
import { MarkerHighlighter } from './MarkerHighlighter'

// --- Config ---
const FONT = '17px/1 "Source Serif 4", Georgia, "Times New Roman", serif'
const FONT_MEASURE = '17px "Source Serif 4", Georgia, "Times New Roman", serif'
const LINE_HEIGHT = 27
const COL_GAP = 36
const PADDING = 0
const OBSTACLE_MARGIN = 12

// --- Article text ---
const PARAGRAPHS = [
  `The practice of highlighting important passages has ancient roots that stretch back to the earliest days of written language. Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication to guide readers through dense theological texts. Red ink, derived from cinnabar or vermillion pigments, was used to mark chapter headings and significant passages — giving us the word "rubric" from the Latin rubrica, meaning red earth. These marks were functional, precise, and deeply intentional.`,

  `The illuminated manuscripts of the twelfth and thirteenth centuries elevated this practice into high art. Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty. A single decorated initial might take days to complete, its intricate knotwork and miniature scenes serving simultaneously as decoration and as a visual anchor that helped readers navigate through dense columns of carefully lettered text. The marriage of utility and beauty was seamless.`,

  `For centuries, personal annotation remained essentially unchanged. Students underlined passages in pencil. Scholars filled margins with cramped commentary. Editors wielded red pens with surgical authority. The fundamental act of drawing attention to words that matter stayed the same across generations of readers and writers, even as the tools evolved from quill to fountain pen to ballpoint.`,

  `The modern fluorescent highlighter arrived remarkably late in this long history. Carter's Ink Company introduced the Hi-Liter in 1963, using a water-based fluorescent ink that could overlay printed text without obscuring it. The luminous yellow became instantly iconic — chosen not by accident but by careful design, because it was clearly visible on the page yet would not reproduce when photocopied, preserving the clean appearance of shared documents.`,

  `Today, digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical to medieval scribes. On screens, highlighted text can be animated, layered with transparency, and styled with effects that echo the organic imperfection of a real pen stroke. A marker effect drawn on canvas can ripple with wavering edges and variable opacity, carrying an unmistakable echo of the human hand across centuries of practice.`,

  `The challenge of flowing text around images and shapes while maintaining these highlighting effects represents a fascinating intersection of typography and interactive design. Traditional CSS layouts handle basic text wrapping, but they lack the flexibility to flow text around arbitrary obstacles or to recompute layouts dynamically as conditions change. The browser must recalculate layout from scratch each time.`,

  `Libraries like pretext solve this through pure arithmetic — computing text layout independently of the browser's rendering engine, using cached font metrics to determine exactly where each line should break. Text flows around photographs and illustrations with a precision that CSS alone cannot achieve, while maintaining the performance needed for smooth interaction and real-time reflow on every resize.`,

  `When combined with canvas-based highlighting, the result is something genuinely new: a reading experience that feels both unmistakably modern and deeply connected to centuries of marked text. The wavering line of a digital highlighter, imperfect by careful design, carries forward something essential from those first red marks made by candlelight in a medieval monastery — the simple human impulse to say: this matters, remember this.`,

  `The performance implications of this approach are striking. Where traditional DOM-based highlighting requires expensive layout reflows — each call to getClientRects() forces the browser to recalculate the position of every element — pretext's arithmetic layout runs in microseconds. A resize that might take fifty milliseconds with DOM measurement completes in under a tenth of a millisecond. The text snaps into place. The highlights follow instantly.`,

  `This speed opens new possibilities. Text can reflow continuously during window resizing, not in jerky debounced steps. Highlights can track dynamically changing content without visible lag. Multiple columns of flowing text — something that pushes CSS to its limits — become trivial when layout is just arithmetic on cached measurements. The constraints that once shaped digital typography begin to dissolve.`,
]

// --- Marks across four styles ---
const MARKS: PretextMark[] = [
  // HIGHLIGHT style (yellow marker) — large sections
  {
    phrase: 'Medieval scribes working in dimly lit scriptoriums developed elaborate systems of marginalia and rubrication',
    color: '#FDD835',
    drawingMode: 'highlight',
    options: {
      animationSpeed: 2200,
      height: 1,
      highlight: { amplitude: 0.2, wavelength: 5, roughEnds: 2 },
    },
  },
  {
    phrase: 'Gold leaf and vivid pigments transformed functional markers into objects of extraordinary beauty',
    color: '#FFE082',
    drawingMode: 'highlight',
    options: {
      animationSpeed: 2000,
      height: 1,
      highlight: { amplitude: 0.15, wavelength: 3, roughEnds: 1 },
    },
  },
  {
    phrase: 'The luminous yellow became instantly iconic',
    color: '#FFF176',
    drawingMode: 'highlight',
    options: { animationSpeed: 1400, height: 1, highlight: { amplitude: 0.25, wavelength: 4, roughEnds: 1.5 } },
  },
  {
    phrase: 'digital highlighting has inherited these ancient traditions while gaining capabilities that would have seemed magical',
    color: '#FFD54F',
    drawingMode: 'highlight',
    options: { animationSpeed: 2400, height: 1, highlight: { amplitude: 0.18, wavelength: 6, roughEnds: 2 } },
  },

  // CIRCLE style (red hand-drawn circles)
  {
    phrase: 'red earth',
    color: '#EF5350',
    drawingMode: 'circle',
    options: {
      animationSpeed: 1800,
      circle: { curve: 0.6, wobble: 0.35, loops: 3, thickness: 2.5 },
    },
  },
  {
    phrase: 'utility and beauty was seamless',
    color: '#E57373',
    drawingMode: 'circle',
    options: {
      animationSpeed: 2200,
      circle: { curve: 0.5, wobble: 0.3, loops: 2, thickness: 2 },
    },
  },
  {
    phrase: 'organic imperfection',
    color: '#EF5350',
    drawingMode: 'circle',
    options: {
      animationSpeed: 1600,
      circle: { curve: 0.7, wobble: 0.4, loops: 3, thickness: 2.5 },
    },
  },

  // SCRIBBLE style (green energetic scribbles)
  {
    phrase: 'this matters, remember this',
    color: '#66BB6A',
    drawingMode: 'scribble',
    options: { animationSpeed: 1500 },
  },
  {
    phrase: 'pure arithmetic',
    color: '#81C784',
    drawingMode: 'scribble',
    options: { animationSpeed: 1200 },
  },

  // SKETCHOUT style (blue sketchy rectangles)
  {
    phrase: 'cached font metrics',
    color: '#42A5F5',
    drawingMode: 'sketchout',
    options: { animationSpeed: 1600 },
  },
  {
    phrase: 'runs in microseconds',
    color: '#64B5F6',
    drawingMode: 'sketchout',
    options: { animationSpeed: 1400 },
  },
  {
    phrase: 'constraints that once shaped digital typography begin to dissolve',
    color: '#42A5F5',
    drawingMode: 'sketchout',
    options: { animationSpeed: 2000 },
  },
]

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

function ellipsePolygon(
  cx: number, cy: number, rx: number, ry: number, angleDeg = 0, n = 24,
): { x: number; y: number }[] {
  const a = angleDeg * Math.PI / 180
  const cosA = Math.cos(a), sinA = Math.sin(a)
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI
    const px = rx * Math.cos(t), py = ry * Math.sin(t)
    return { x: cx + px * cosA - py * sinA, y: cy + px * sinA + py * cosA }
  })
}

// --- SVG shape definitions ---
interface ShapeDef {
  id: string
  svg: string
  width: number
  height: number
  xFraction: number    // horizontal center as fraction of container width
  topFraction: number  // vertical center as fraction of estimated column height
  rotation: number     // CSS rotation in degrees
  contourType: 'circle' | 'rect' | 'ellipse'
}

const SHAPES: ShapeDef[] = [
  {
    id: 'large-circle',
    svg: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="circGrad" cx="40%" cy="40%">
          <stop offset="0%" stop-color="#E53935" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#FF8A65" stop-opacity="0.06"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="110" fill="url(#circGrad)" stroke="#E5393512" stroke-width="3"/>
      <circle cx="120" cy="120" r="80" fill="none" stroke="#E5393508" stroke-width="1.5" stroke-dasharray="8 6"/>
      <circle cx="120" cy="120" r="45" fill="none" stroke="#E5393506" stroke-width="1"/>
    </svg>`,
    width: 240,
    height: 240,
    xFraction: 0.31,
    topFraction: 0.15,
    rotation: 0,
    contourType: 'circle',
  },
  {
    id: 'tilted-rect',
    svg: `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rectGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E88E5" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#7C4DFF" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="220" height="180" rx="12" fill="url(#rectGrad)" stroke="#1E88E510" stroke-width="2"/>
      <rect x="40" y="40" width="160" height="120" rx="8" fill="none" stroke="#7C4DFF08" stroke-width="1.5"/>
    </svg>`,
    width: 240,
    height: 200,
    xFraction: 0.67,
    topFraction: 0.42,
    rotation: 15,
    contourType: 'rect',
  },
  {
    id: 'rotated-ellipse',
    svg: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ellGrad" cx="45%" cy="45%">
          <stop offset="0%" stop-color="#43A047" stop-opacity="0.16"/>
          <stop offset="100%" stop-color="#00897B" stop-opacity="0.05"/>
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="60" rx="90" ry="52" fill="url(#ellGrad)" stroke="#43A04710" stroke-width="2.5"/>
      <ellipse cx="100" cy="60" rx="58" ry="30" fill="none" stroke="#43A04708" stroke-width="1.5" stroke-dasharray="6 8"/>
    </svg>`,
    width: 200,
    height: 120,
    xFraction: 0.34,
    topFraction: 0.70,
    rotation: -12,
    contourType: 'ellipse',
  },
]

// --- Metrics display ---
function updateMetrics(m: PretextMetrics) {
  const el = document.getElementById('metrics')
  if (!el) return
  el.innerHTML = `
    <span>prepare: <strong>${m.prepareMs.toFixed(1)}ms</strong></span>
    <span>layout: <strong>${m.layoutMs.toFixed(2)}ms</strong></span>
    <span>render: <strong>${m.renderMs.toFixed(1)}ms</strong></span>
    <span>${m.lineCount} lines across ${m.paragraphCount} paragraphs</span>
  `
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

  const container = document.getElementById('pretext-container') as HTMLDivElement
  if (!container) return

  const containerWidth = container.clientWidth

  // Calculate obstacle positions from shape definitions
  const obstacles: PretextObstacle[] = []
  const shapeElements: HTMLElement[] = []

  const estimatedLineCount = PARAGRAPHS.reduce((acc, p) => acc + Math.ceil(p.length / 45), 0)
  const estimatedColumnHeight = Math.ceil(estimatedLineCount / 3) * LINE_HEIGHT

  for (const shape of SHAPES) {
    const cx = shape.xFraction * containerWidth
    const cy = shape.topFraction * estimatedColumnHeight
    const shapeX = cx - shape.width / 2
    const shapeY = cy - shape.height / 2

    // Create SVG element
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
    shapeElements.push(wrapper)

    // Generate polygon contour for text nestling
    let polygon: { x: number; y: number }[]
    if (shape.contourType === 'circle') {
      polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
    } else if (shape.contourType === 'rect') {
      polygon = rotatedRectPolygon(cx, cy, shape.width, shape.height, shape.rotation)
    } else {
      polygon = ellipsePolygon(cx, cy, shape.width / 2, shape.height / 2, shape.rotation)
    }

    obstacles.push({
      x: shapeX,
      y: shapeY,
      width: shape.width,
      height: shape.height,
      margin: OBSTACLE_MARGIN,
      polygon,
    })
  }

  // Create PretextHighlighter
  const highlighter = new PretextHighlighter(container, {
    font: FONT_MEASURE,
    lineHeight: LINE_HEIGHT,
    containerPadding: PADDING,
    columns: 3,
    columnGap: COL_GAP,
    paragraphs: PARAGRAPHS,
    marks: MARKS,
    obstacles,
    animate: true,
    animationSpeed: 1800,
    animationTrigger: 'scrollIntoView',
    padding: 0.12,
    height: 1,
    highlight: { amplitude: 0.2, wavelength: 4, roughEnds: 1.5 },
    onLayout: updateMetrics,
  })

  // Reposition shapes on resize
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const newWidth = container.clientWidth
      const newObstacles: PretextObstacle[] = []

      for (let i = 0; i < SHAPES.length; i++) {
        const shape = SHAPES[i]
        const cx = shape.xFraction * newWidth
        const cy = shape.topFraction * estimatedColumnHeight
        const shapeX = cx - shape.width / 2
        const shapeY = cy - shape.height / 2

        const wrapper = shapeElements[i]
        wrapper.style.left = `${shapeX}px`
        wrapper.style.top = `${shapeY}px`

        let polygon: { x: number; y: number }[]
        if (shape.contourType === 'circle') {
          polygon = circlePolygon(cx, cy, Math.min(shape.width, shape.height) / 2)
        } else if (shape.contourType === 'rect') {
          polygon = rotatedRectPolygon(cx, cy, shape.width, shape.height, shape.rotation)
        } else {
          polygon = ellipsePolygon(cx, cy, shape.width / 2, shape.height / 2, shape.rotation)
        }

        newObstacles.push({
          x: shapeX,
          y: shapeY,
          width: shape.width,
          height: shape.height,
          margin: OBSTACLE_MARGIN,
          polygon,
        })
      }

      highlighter.setObstacles(newObstacles)
    }, 150)
  })

  // Init traditional section
  initTraditionalSection()
})()
