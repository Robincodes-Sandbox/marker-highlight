# MarkerHighlight.js

A JavaScript library for adding dynamic, animated highlight effects to text on web pages. Canvas-based rendering with multiple drawing modes.

**[Live Demo](https://marker-highlight.solarise.dev)**

## Features

- Multiple drawing modes: highlight, circle, burst, scribble, sketchout
- Animated rendering with configurable speed and easing
- Multi-line support with sequential line animation
- Scroll-triggered animations via IntersectionObserver
- Reusable named styles via `defineStyle`
- Nested highlight support
- Non-destructive — uses canvas overlays, doesn't modify text DOM
- Per-element configuration via data attributes

## Installation

Download `dist/index.js` and include it in your page:

```html
<script type="module">
  import { MarkerHighlighter } from './dist/index.js';
  new MarkerHighlighter(document.body);
</script>
```

## Usage

Wrap text in `<mark>` tags and initialise the highlighter:

```html
<p>This is <mark>highlighted text</mark>.</p>

<script type="module">
  import { MarkerHighlighter } from './dist/index.js';
  new MarkerHighlighter(document.body, {
    animationSpeed: 1000,
    padding: 0.2,
    highlight: {
      amplitude: 0.3,
      wavelength: 5
    }
  });
</script>
```

### Data Attributes

Override options per element:

```html
<mark data-drawing-mode="circle" data-animation-speed="1500" data-height="1.8" data-padding="0.8">
  Circled text
</mark>

<mark data-animation-trigger="scrollIntoView">
  Animates on scroll
</mark>

<mark data-highlight='{"amplitude": 0.5, "wavelength": 3}'>
  Custom wave
</mark>

<mark data-burst='{"style": "cloud", "count": 25, "power": 1.5}'>
  Cloud burst
</mark>
```

### Named Styles

Define reusable styles and apply them with `data-highlight-style`:

```javascript
MarkerHighlighter.defineStyle('underline', {
  animationSpeed: 400,
  height: 0.15,
  offset: 0.8,
  padding: 0,
  highlight: { amplitude: 0.2, wavelength: 5, roughEnds: 0 }
});
```

```html
<mark data-highlight-style="underline">Underlined text</mark>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animationSpeed` | number | 1000 | Animation duration in ms |
| `drawingMode` | string | `'highlight'` | `highlight`, `circle`, `burst`, `scribble`, `sketchout` |
| `height` | number | 1 | Height relative to line height |
| `offset` | number | 0 | Vertical offset (negative = up, positive = down) |
| `padding` | number | 0.2 | Horizontal padding around text |
| `skewX` | number | 0 | Horizontal slant |
| `multiLineDelay` | number | 0 | Delay between line segments (ratio of animationSpeed) |
| `animationTrigger` | string | — | Set to `'scrollIntoView'` for scroll-triggered animation |

### Highlight options

Passed via `highlight` object or `data-highlight` attribute:

| Option | Description |
|--------|-------------|
| `amplitude` | Edge waviness (0 = flat, 1+ = wavy) |
| `wavelength` | Wave frequency |
| `roughEnds` | Irregularity at highlight start/end |

### Circle options

Passed via `circle` object or `data-circle` attribute:

| Option | Description |
|--------|-------------|
| `curve` | Shape: 0 = square, 0.5 = rounded, 1 = ellipse |
| `loops` | Number of overlapping strokes |
| `thickness` | Line thickness |
| `wobble` | Hand-drawn irregularity |

### Burst options

Passed via `burst` object or `data-burst` attribute:

| Option | Description |
|--------|-------------|
| `style` | `'lines'`, `'curve'`, `'cloud'` |
| `count` | Number of rays/puffs |
| `power` | Ray length multiplier |
| `randomness` | Variation in placement |

## Drawing Modes

- **highlight** — Classic highlighter pen effect with wavy edges
- **circle** — Hand-drawn circle/ellipse around text
- **burst** — Radiating lines, curves, or cloud puffs
- **scribble** — Chaotic hand-drawn scribble
- **sketchout** — Rough rectangle outline

## Development

```bash
git clone https://github.com/Robincodes-Sandbox/marker-highlight.git
cd marker-highlight
npm install
npm run dev      # watch build + live-server on port 3000
npm run build    # production build to dist/
```

## Project Structure

```
src/               TypeScript source
  renderers/       Drawing mode implementations
  MarkerHighlighter.ts
  Options.ts
  RectModel.ts
  Color.ts
  Utilities.ts
dist/              Built library (committed)
index.html         Demo page
test.html          Test cases
```

## License

[MIT](LICENSE)

## Author

Robin Metcalfe
