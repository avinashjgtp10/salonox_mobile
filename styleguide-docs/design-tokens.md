# Design Tokens

Design tokens are the foundational design decisions documented as data. They are used to maintain consistency across our UI components.

## Color Tokens

### Primary Colors

- **Primary** - Main brand color used for primary actions
- **Secondary** - Supporting color for secondary actions
- **Success** - Used to indicate successful actions or positive states
- **Warning** - Used to indicate cautionary states
- **Danger** - Used to indicate errors or dangerous actions
- **Info** - Used to provide informational messages

### Neutral Colors

- **Dark** - Dark text and backgrounds
- **Light** - Light backgrounds and text
- **Muted** - Muted or disabled states
- **Border** - Border colors for dividers and edges

## Typography

### Font Family

Primary font stack is defined to ensure consistent typography across all platforms:

```
Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

### Font Sizes

- **Small** (12px) - Secondary text, labels
- **Base** (14px) - Default text size
- **Large** (16px) - Large text
- **XL** (18px) - Section headers
- **2XL** (24px) - Page titles

### Font Weights

- **Light** (300) - Light, less emphasis
- **Regular** (400) - Default weight
- **Medium** (500) - Medium emphasis
- **Bold** (700) - Strong emphasis

### Line Heights

- **Tight** (1.2) - Compact spacing
- **Normal** (1.5) - Standard spacing
- **Relaxed** (1.75) - Generous spacing

## Spacing

Spacing follows an 8px base unit scale:

- **xs** - 4px
- **sm** - 8px
- **md** - 16px
- **lg** - 24px
- **xl** - 32px
- **2xl** - 48px
- **3xl** - 64px

## Border Radius

Rounded corners use a consistent scale:

- **small** - 4px
- **medium** - 8px
- **large** - 12px
- **full** - 9999px (for circular elements)

## Shadows

Box shadows create depth and hierarchy:

- **xs** - Subtle shadow for minor elevation
- **sm** - Small shadow for slight elevation
- **md** - Medium shadow for moderate elevation
- **lg** - Large shadow for significant elevation
- **xl** - Extra large shadow for maximum elevation

## Breakpoints

Responsive design breakpoints:

- **Mobile** - 320px to 575px
- **Tablet** - 576px to 991px
- **Desktop** - 992px and above

## Component-Specific Tokens

### Button

- **Height (small)** - 32px
- **Height (medium)** - 40px
- **Height (large)** - 48px
- **Padding (horizontal)** - 12px - 24px

### Input

- **Height** - 40px
- **Border Color** - #D1D5DB
- **Border Radius** - 8px
- **Padding** - 8px 12px

### Card

- **Border Radius** - 8px
- **Padding** - 16px - 24px
- **Box Shadow** - Small elevation

### Badge

- **Padding** - 4px 8px
- **Border Radius** - 4px
- **Font Size** - 12px
- **Font Weight** - 500

## Animation

Animations are kept subtle and purposeful:

- **Transition Duration** - 200ms for simple transitions
- **Transition Duration** - 300ms for complex transitions
- **Easing** - ease-in-out for most animations
- **Easing** - ease-out for entrance animations

## Accessibility

All color tokens meet WCAG AA standards for contrast ratios:

- **Text on Background** - 4.5:1 minimum contrast
- **UI Component on Background** - 3:1 minimum contrast

Color is never used as the only means of conveying information; icons, patterns, or text labels are used alongside colors.

## Implementation

These tokens are implemented using:

- **CSS Custom Properties** - For runtime theming
- **TypeScript Constants** - For compile-time type safety
- **SC SCSS Variables** - For preprocessing and calculations

When creating new components, always reference these tokens instead of hardcoding values. This ensures consistency and makes it easier to maintain and update the design system.
