# MarkerHighlight.js

MarkerHighlight.js is a JavaScript library designed to add dynamic and customizable highlight effects to text on web pages. It offers various rendering modes and animation options to create engaging visual emphasis for selected text.

## Features

- Multiple rendering modes: highlight and circle
- Customizable animation effects
- Non-destructive DOM manipulation
- Responsive design support
- Easy integration with existing web projects

## Installation

To use MarkerHighlight.js in your project, include the following script tag in your HTML file:

```html
<script type="module" src="path/to/markerhighlight.js"></script>
```

## Usage

1. Add the `mark` tag to the text you want to highlight:

```html
<p>This is <mark>highlighted text</mark>.</p>
```

2. Initialize MarkerHighlight:

```javascript
import { MarkerHighlighter } from './path/to/markerhighlight.js';

const container = document.querySelector('body');
new MarkerHighlighter(container, options);
```

3. Customize highlight options using data attributes:

```html
<mark data-animation-speed="1000" data-height="1.5" data-drawing-mode="circle">Custom highlight</mark>
```

## Configuration Options

MarkerHighlight.js supports various configuration options to customize the highlight effect. Here are some key options:

- `animate`: Boolean to enable/disable animation
- `animationSpeed`: Duration of the animation in milliseconds
- `height`: Height of the highlight relative to text size
- `drawingMode`: Rendering mode ('highlight' or 'circle')
- `wavelength`: Wavelength of the highlight wave effect
- `amplitude`: Amplitude of the highlight wave effect

For a full list of options and their descriptions, refer to the `Options.ts` file.

## Renderers

### Highlight Renderer

The Highlight Renderer creates a wavy highlight effect beneath the text. It uses the following key techniques:

- Canvas-based rendering for smooth animations
- Quadratic curves to create natural-looking waves
- Color gradients for depth and visual interest
- Multi-line support with individual line animations

Key customization options:
- `wavelength`: Controls the frequency of waves
- `amplitude`: Adjusts the height of waves
- `roughEnds`: Adds irregularity to the start and end of highlights

### Circle Renderer

The Circle Renderer creates a hand-drawn circular highlight effect around the text. Key features include:

- Bezier curves for smooth, natural-looking shapes
- Multiple loops with varying opacity for a layered effect
- Randomized "wobble" effect for an organic, hand-drawn appearance

Key customization options:
- `curve`: Controls the overall shape (from square to ellipse)
- `wobble`: Adjusts the irregularity of the shape
- `loops`: Sets the number of circular paths drawn
- `thickness`: Controls the line thickness

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/MarkerHighlight.js.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run start
   ```

4. Open `test.html` or `index.html` in your browser to see the library in action.

## Building the Project

To build the project for production:

```
npm run build
```

This will create a minified version of the library in the `dist` folder.

## Testing

The project includes a `test.html` file that showcases various configurations and use cases for MarkerHighlight.js. To run the tests:

1. Start the development server (if not already running):
   ```
   npm run start
   ```

2. Open `test.html` in your browser.

3. Observe the different highlight effects and their animations.

4. Use the "Rerun Test" buttons to trigger animations again and see performance metrics.

## Project Structure

- `src/`: Source files for the library
  - `renderers/`: Contains different rendering modes (Highlight, Circle, etc.)
  - `MarkerHighlighter.ts`: Main class for initializing and managing highlights
  - `Options.ts`: Defines and validates configuration options
  - `RectModel.ts`: Model handling representation of the DOM element created to display the marker highlight (BG canvas)
  - `Color.ts`: Color manipulation utilities
  - `Utilities.ts`: General utility functions
- `dist/`: Compiled and minified library files
- `test.html`: Test cases and examples
- `index.html`: Demo page showcasing various highlight effects

## Contributing

Contributions to MarkerHighlight.js are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them with clear, descriptive messages
4. Push your changes to your fork
5. Submit a pull request to the main repository

## License

[MIT License](LICENSE)

## Acknowledgments

- Robin Metcalfe - Creator and main contributor
