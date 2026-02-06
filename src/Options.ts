import { Utilities } from './Utilities';

const validationRules = [
    {
        property: 'animate',
        type: 'boolean',
        default: true,
        description: 'Whether or not to animate the highlights. A highlight with animate = false will display as soon as the page is loaded. When animate = true, the highlight will appear based on the animationSpeed and highlightDelay settings.'
    },
    {
        property: 'animationSpeed',
        type: 'number',
        min: 100,
        max: 100000,
        default: 5000,
        description: 'The speed of the animation in milliseconds, the time taken between when the animation starts and when the highlight reaches the end of the text.'
    },
    {
        property: 'animationTrigger',
        type: 'enum',
        validValues: ['load', 'scrollIntoView'],
        default: 'load',
        description: 'The event that triggers the animation. "load" means the animation will start as soon as the page is loaded. "scrollIntoView" means the animation will start when the element is scrolled into view.'
    },
    /*{
        property: 'delay',
        type: 'number',
        min: 0,
        max: 60000,
        default: 0
    },*/
    /*{
        property: 'highlightDelay',
        type: 'number',
        min: 0,
        max: 1,
        default: 0,
        description: 'The delay before each highlight starts animating. Enter a value between 0 and 1. 0 means all highlights will start at the same time. 1 means each highlight starts once the previous one has finished. A value like e.g. 0.4 means each highlight starts once 40% of the previous highlight has finished.'
    },*/

    {
        property: 'height',
        type: 'number',
        min: 0,
        default: 1,
        description: 'The height of the highlight. 1 means the highlight will be the same height as the text. 0.5 means the highlight will be half the height of the text. 2 means the highlight will be twice the height of the text and so on. This will not be affected by the CSS line-height property, only the visual height of the text.'
    },
    {
        property: 'offset',
        type: 'number',
        min: -5,
        max: 5,
        default: 0,
        description: 'The vertical offset of the highlight. 0 means the highlight will be positioned directly on top of the text. -1 means the highlight will be positioned 1 line above the text. 1 means the highlight will be positioned 1 line below the text. Works nicely in tandem with the height property for e.g. overline, underline, strikethrough effects.'
    },
    /*{
        property: 'variation',
        type: 'number',
        min: 0,
        max: 2,
        default: 1
    },*/
    {
        property: 'padding',
        type: 'number',
        min: -10,
        max: 10,
        default: 0,
    },
    /*{
        property: 'horizontalPadding',
        type: 'object',
        scalarField: 'strength',
        expectedProperties: [
            { name: 'variation', type: 'number', min: 0, max: 2, default: 1, description: 'The variation in the horizontal padding. 0 means no variation, 1 means the padding can vary by up to 100% of the padding amount.' },
            { name: 'strength', type: 'number', min: 0, max: 5, default: 0.25, description: 'The strength of the horizontal padding. 0 means no padding, 1 means left/right padding equal to 1rem' },
            { name: 'rough', type: 'number', min: 0, max: 10, default: 0, description: 'The roughness of the horizontal padding. 0 means no roughness, 1 means a more jagged effect' }
        ],
        default: { strength: 0.5 }
    }, */// todo - change this to just a single scalar, move roughEnds into highlight renderer

    // renderer specific settings for highlight
    {
        property: 'highlight',
        type: 'object',
        scalarField: 'wavelength',
        expectedProperties: [
            { name: 'wavelength', type: 'number', min: 0, max: 50, default: 1, description: 'The wavelength of the wave. 1 means the wave will be a single wave across the entire highlight. 2 means the wave will have 2 waves across the highlight.' }, // TODO - implement 1 = 1 wave
            { name: 'amplitude', type: 'number', min: 0, max: 50, default: 0.25, description: 'The amplitude of the wave. 0.5 means the wave will be half the height of the highlight. 1 means the wave will be the same height as the highlight.' },
            { name: 'roughEnds', type: 'number', min: 0, max: 500, default: 5, description: 'The roughness of the wave ends. 0 means the wave will have smooth ends. 1 means the wave will have rough ends.' },
            { name: 'jitter', type: 'number', min: 0, max: 25, default: .1, description: 'The jitter of the wave. 0 means no jitter, 1 means the wave will be very jittery.' },
        ],
        default: { wavelength: 1 }
    },


    {
        property: 'circle',
        type: 'object',
        scalarField: 'curve',
        expectedProperties: [
            {
                name: 'curve',
                type: 'number',
                min: 0,
                max: 1,
                default: 0.5,
                description: 'Controls the shape of the circle. 0 for square, 0.5 for rounded corners, 1 for ellipse.'
            },
            {
                name: 'wobble',
                type: 'number',
                min: 0,
                max: 1,
                default: 0.3,
                description: 'The amount of irregularity in the circle. 0 for perfect shape, 1 for maximum wobble.'
            },
            {
                name: 'loops',
                type: 'number',
                min: 1,
                max: 10,
                default: 3,
                description: 'The number of loops to draw around the text.'
            },
            {
                name: 'thickness',
                type: 'number',
                min: 1,
                max: 10,
                default: 2,
                description: 'The base thickness of the pen stroke. Actual thickness varies along the path.'
            }
        ],
        default: { curve: 0.5, wobble: 0.3, loops: 3, thickness: 5 }
    },

    {
        property: 'burst',
        type: 'object',
        scalarField: 'power',
        expectedProperties: [
            { name: 'style', type: 'enum', validValues: ['lines', 'burst', 'curve', 'cloud'], default: 'lines' },
            { name: 'power', type: 'number', min: 0.1, max: 5, default: 1 },
            { name: 'count', type: 'number', min: 3, max: 500, default: 10 },
            { name: 'randomness', type: 'number', min: 0, max: 1, default: 0.5 }
        ],
        default: { style: 'lines', power: 1, count: 10, randomness: 0.5 }
    },
    {
        property: 'wavelength',
        type: 'number',
        min: 0,
        max: 500,
        default: 1
    },
    {
        property: 'amplitude',
        type: 'number',
        min: 0,
        max: 500,
        default: 0.5
    },
    {
        property: 'easing',
        type: 'enum',
        validValues: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'],
        default: 'ease',
        description: 'The easing function to use for the animation. Accepted values are "ease", "linear", "ease-in", "ease-out", "ease-in-out".'
    },
    {
        property: 'drawingMode',
        type: 'enum',
        validValues: ['highlight', 'circle', 'burst' /*, 'scribble', 'sketchout', 'circle'*/],
        default: 'highlight',
        description: 'The drawing mode to use for the highlight. Accepted values are "highlight" for a standard highlight effect. (More TBC)'
    },
    {
        property: 'debug',
        type: 'boolean',
        default: false,
        description: 'When true, adds debugging features like highlight borders and option popups on hover'
    },
    {
        property: 'skewX',
        type: 'number',
        min: -10,
        max: 10,
        default: 0,
        description: 'Skews the highlight horizontally by the specified amount (in units of line height)'
    },
    {
        property: 'skewY',
        type: 'number',
        min: -10,
        max: 10,
        default: 0,
        description: 'Skews the highlight vertically by the specified amount (in units of line height)'
    },
    {
        property: 'multiLineDelay',
        type: 'number',
        min: 0,
        max: 1,
        default: 0,
        description: 'Controls the delay between multiline highlights. 0 means all lines start at once, 1 means each line waits for the previous to finish'
    },
    {
        property: 'delay',
        type: 'number',
        min: 0,
        max: 60000,
        default: 0,
        description: 'Delay in milliseconds before starting the highlight animation'
    }


];


export interface ValidationRule {
    property: string;
    type: string;
    min?: number;
    max?: number;
    default: any;
    validValues?: string[];
    scalarField?: string;
    expectedProperties?: { name: string; type: string; min?: number; max?: number; default: any }[];
}

export class OptionsValidator {
    constructor() {
        // No need to pass rules anymore
    }

    validate(options: Record<string, any>): Record<string, any> {

        const validOptions: Record<string, any> = {};
        const validKeys = new Set(validationRules.map(rule => rule.property));

        // Check for invalid options
        for (const key in options) {
            if (!validKeys.has(key)) {
                //throw new Error(`Invalid option '${key}' provided. This option is not defined in the validation rules.`);
                console.error(`Unknown option '${key}' provided. This option is not defined in the validation rules.`)
            }
        }

        validationRules.forEach(rule => {
            let value = options[rule.property];

            // If the value is undefined, assign the default value
            if (value === undefined) {
                value = rule.default;
            }

            if (rule.type === 'object' && rule.expectedProperties) {
                if (rule.scalarField && (typeof value !== 'object' || value === null)) {
                    value = { [rule.scalarField]: value };
                } else if (typeof value !== 'object' || value === null) {
                    value = {};
                }

                rule.expectedProperties.forEach(subRule => {
                    if (value[subRule.name] === undefined) {
                        value[subRule.name] = subRule.default;
                    }
                });

                this.validateObjectProperties(value, rule.expectedProperties, rule.property);
            } else {
                this.validateValue(value, rule);
            }

            validOptions[rule.property] = value;
        });

        return validOptions;
    }

    private validateObjectProperties(obj: Record<string, any>, expectedProperties: ValidationRule['expectedProperties'], parentProperty: string) {
        expectedProperties?.forEach(subRule => {
            let value = obj[subRule.name];
            value = this.validateValue(value, { ...subRule, property: `${parentProperty}.${subRule.name}` });
        });
    }

    private validateValue(value: any, rule: ValidationRule) {
        switch (rule.type) {
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return rule.default;
                    throw new Error(`Option '${rule.property}' should be a boolean.`);
                }
                break;
            case 'number':
                value = parseFloat(value);
                if (isNaN(value) || (rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) {
                    return rule.default;
                    throw new Error(`Option '${rule.property}' should be a number${rule.min !== undefined ? ` between ${rule.min}` : ''}${rule.max !== undefined ? ` and ${rule.max}` : ''}.`);
                }
                break;
            case 'enum':
                if (!rule.validValues?.includes(value)) {
                    return rule.default;
                    throw new Error(`Option '${rule.property}' should be one of ${rule.validValues?.join(', ')}.`);
                }
                break;
        }
    }

    extractAttributes(el: HTMLElement): Record<string, any> {
        const attributes: Record<string, any> = {};
        
        for (const rule of validationRules) {
            const attributeName = `data-${Utilities.camelToKebab(rule.property)}`;
            let attributeValue: string | null = el.getAttribute(attributeName);

            if (attributeValue !== null) {
                switch (rule.type) {
                    case 'boolean':
                        attributes[rule.property] = attributeValue === 'true';
                        break;
                    case 'number':
                        const numValue = parseFloat(attributeValue);
                        attributes[rule.property] = !isNaN(numValue) ? numValue : undefined;
                        break;
                    case 'object':
                        try {
                            attributes[rule.property] = JSON.parse(attributeValue);
                        } catch (e) {
                            continue; // Skip this attribute if it's not a valid JSON string
                        }
                        break;
                    case 'enum':
                        if (rule.validValues?.includes(attributeValue)) {
                            attributes[rule.property] = attributeValue;
                        }
                        break;
                    default:
                        attributes[rule.property] = attributeValue;
                        break;
                }
            }
        }
        return attributes;
    }

    validateElement(el: HTMLElement): Record<string, any> {
        const options = this.extractAttributes(el);
        return this.validate(options);
    }
}