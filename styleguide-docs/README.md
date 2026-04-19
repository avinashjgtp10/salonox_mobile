# React Styleguidist Setup Guide

This directory contains the setup and configuration for React Styleguidist, which provides interactive documentation for your components.

## What is React Styleguidist?

React Styleguidist is a component development environment with hot-reloading, a live style guide, and interactive examples. It helps:

- **Document Components** - Create living documentation with interactive examples
- **Test Components** - Test components in isolation in the browser
- **Develop Components** - Develop components with instant feedback
- **Share Knowledge** - Share component patterns and best practices with your team

## Project Structure

```
salon_mgm_frontend/
├── styleguide.config.js          # Main Styleguidist configuration
├── styleguide-docs/              # Documentation sections
│   ├── introduction.md           # Project overview
│   ├── design-tokens.md          # Design system tokens
│   ├── getting-started.md        # How to use components
│   └── contributing.md           # Contributing guidelines
└── src/components/ui/            # UI components
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── ... (other components)
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This will install React Styleguidist and all necessary dependencies.

### 2. Start the Styleguide Server

```bash
npm run styleguide
```

This starts a development server at `http://localhost:6060` with hot module reloading.

### 3. Build Production Styleguide

```bash
npm run styleguide:build
```

This builds a static HTML version of the styleguide that can be deployed.

## Configuration

The main configuration file is `styleguide.config.js`. Key settings:

### Project Information
```javascript
title: 'Salon Management System - Component Library',
description: 'Interactive component style guide and documentation',
version: require('./package.json').version,
```

### Component Discovery
```javascript
components: 'src/components/ui/*.tsx'
```

Finds all `.tsx` files in the `src/components/ui/` directory.

### Sections
Organizes components into logical groups:

```javascript
sections: [
  {
    name: 'UI Components',
    components: 'src/components/ui/*.tsx',
  },
  // ... other sections
]
```

### Server Configuration
```javascript
serverPort: 6060  // Port where the styleguide server runs
```

## Writing Component Documentation

### JSDoc Comments

Use JSDoc comments in your component files to document components:

```tsx
/**
 * Button - A reusable button component with multiple variants
 * 
 * Use Button for all primary and secondary actions in the application.
 * 
 * @example
 * ```tsx
 * <Button variant="primary">Save</Button>
 * ```
 * 
 * @example
 * ```tsx
 * <Button variant="danger" size="lg">Delete</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // ...
};
```

### Markdown Documentation Files

Create `.md` files in `styleguide-docs/` for sections:

```markdown
# Section Title

Detailed explanation of the component or concept.

## Subsection

More detailed information.

## Code Examples

\`\`\`tsx
<ComponentName prop="value">Content</ComponentName>
\`\`\`
```

## Component Examples in Styleguidist

### Simple Example

In the component file, add a JSDoc comment:

```tsx
/**
 * @example
 * ```tsx
 * <Button>Click Me</Button>
 * ```
 */
```

### Multiple Examples

```tsx
/**
 * @example
 * ```tsx
 * <Button variant="primary">Primary</Button>
 * ```
 * 
 * @example
 * ```tsx
 * <Button variant="secondary">Secondary</Button>
 * ```
 * 
 * @example
 * ```tsx
 * <Button size="lg" fullWidth>Full Width Large</Button>
 * ```
 */
```

### Complex Examples with State

Create `.md` files next to components:

```markdown
# Button Component Examples

## Basic Button

\`\`\`jsx
<Button>Click Me</Button>
\`\`\`

## Button with State

\`\`\`jsx
const [clicked, setClicked] = React.useState(false);

<Button onClick={() => setClicked(!clicked)}>
  {clicked ? 'Clicked!' : 'Click Me'}
</Button>
\`\`\`
```

## Props Documentation

Document all props with JSDoc:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The button's visual style variant */
  variant?: 'primary' | 'secondary' | 'danger';
  
  /** The button's size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Display a loading spinner */
  loading?: boolean;
  
  /** Icon to display on the left */
  iconLeft?: React.ReactNode;
  
  /** Icon to display on the right */
  iconRight?: React.ReactNode;
  
  /** Make button full width */
  fullWidth?: boolean;
}
```

Styleguidist automatically generates a props table from these types.

## Organizing Components

### By Features

Group related components together:

```javascript
sections: [
  {
    name: 'Form Components',
    components: ['src/components/ui/Input.tsx', 'src/components/ui/Button.tsx'],
  },
  {
    name: 'Data Display',
    components: ['src/components/ui/Table.tsx', 'src/components/ui/Card.tsx'],
  },
]
```

### By Category

Organize using content:

```javascript
sections: [
  {
    name: 'Introduction',
    content: 'styleguide-docs/introduction.md',
  },
  {
    name: 'Components',
    components: 'src/components/ui/*.tsx',
  },
]
```

## Customization

### CSS Styling

Customize the styleguide appearance in `styleguide.config.js`:

```javascript
styles: {
  StyleGuide: {
    '@global body': {
      fontFamily: '"Segoe UI", sans-serif',
      fontSize: '14px',
    },
  },
}
```

### Custom Webpack Configuration

Extend webpack configuration:

```javascript
webpackConfig: {
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    },
  },
}
```

## Building for Production

```bash
npm run styleguide:build
```

Generates a static HTML version in `styleguide/` directory. This can be:

- Deployed to GitHub Pages
- Hosted on a static file server
- Included in your documentation website
- Shared with design teams

## Deployment Options

### GitHub Pages

```bash
npm run styleguide:build
# Push styleguide/ directory to gh-pages branch
```

### Netlify

```bash
npm run styleguide:build
# Deploy styleguide/ directory
```

### AWS S3

```bash
npm run styleguide:build
# Upload styleguide/ to S3 bucket
```

## Tips & Best Practices

### 1. Keep Examples Simple
Start simple and expand complexity in separate examples.

### 2. Use Real Data
Use realistic data in examples to show practical usage.

### 3. Show Variations
Show different variants and states of components.

### 4. Document Edge Cases
Include examples of error states and edge cases.

### 5. Link to Related Components
Use markdown links to reference related components.

### 6. Update Documentation
Keep documentation in sync with component changes.

### 7. Include Type Information
Show TypeScript types in examples.

## Troubleshooting

### Components Not Showing?
- Check `styleguide.config.js` glob pattern
- Verify component is exported
- Ensure component file has `.tsx` extension

### Examples Not Rendering?
- Check JSDoc comment syntax
- Verify code block uses triple backticks
- Check for import statements in examples

### Hot Reload Not Working?
- Restart the styleguide server
- Check for syntax errors
- Clear `.cache` directory

### Props Table Missing?
- Add JSDoc comments to component
- Use proper TypeScript interfaces
- Run `npm run styleguide` again

## Advanced Features

### Custom Theme

Create a custom theme by extending styles:

```javascript
styles: {
  StyleGuide: {
    '@global body': {
      backgroundColor: '#f5f5f5',
    },
  },
  Heading: {
    heading1: {
      fontSize: 40,
      fontWeight: 'bold',
    },
  },
}
```

### Custom Components

Use custom components for rendering:

```javascript
theme: {
  color: {
    base: '#333',
    light: '#999',
    lightest: '#eee',
    link: '#0075d4',
    linkHover: '#0066b3',
    border: '#e0e0e0',
  },
}
```

## Performance Optimization

### Large Projects

For projects with many components:

```javascript
webpackConfig: (env, argv) => ({
  // Increase performance budget
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
})
```

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Build Styleguide
  run: npm run styleguide:build

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./styleguide
```

## Next Steps

1. Run `npm run styleguide` to start developing
2. Add JSDoc comments to components
3. Create markdown documentation files
4. Customize `styleguide.config.js` as needed
5. Build and deploy production version

## Resources

- [React Styleguidist Documentation](https://react-styleguidist.js.org/)
- [JSDoc Reference](https://jsdoc.app/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Webpack Configuration](https://webpack.js.org/configuration/)

## Support

For issues with Styleguidist:
- Check the [official documentation](https://react-styleguidist.js.org/)
- Search [GitHub issues](https://github.com/styleguidist/react-styleguidist/issues)
- Check project-specific documentation in this guide
