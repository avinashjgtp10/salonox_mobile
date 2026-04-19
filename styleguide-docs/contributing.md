# Contributing to the Component Library

Thank you for contributing to the Salon Management System component library! This guide will help you add new components or update existing ones.

## Creating a New Component

### 1. Component Structure

Create a new component file in `src/components/ui/` following this structure:

```tsx
import React from 'react';
import './ComponentName.scss';

/**
 * ComponentName - Brief description of what this component does
 * 
 * Use this component when you need to...
 * 
 * @example
 * ```tsx
 * <ComponentName prop1="value" prop2={true}>
 *   Content
 * </ComponentName>
 * ```
 */

interface ComponentNameProps {
  /** Description of the first prop */
  prop1: string;
  
  /** Description of the second prop */
  prop2?: boolean;
  
  /** Child elements */
  children?: React.ReactNode;
  
  /** CSS class name for styling */
  className?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2 = false,
  children,
  className = '',
}) => {
  return (
    <div className={`component-name ${className}`}>
      {/* Component implementation */}
      {children}
    </div>
  );
};
```

### 2. Component Documentation

Every component must include JSDoc comments with:

- **Description** - What the component does
- **Use Cases** - When to use this component
- **@example** - At least one usage example
- **Props Documentation** - Description for each prop

Example:

```tsx
/**
 * Button - A reusable button component with multiple variants
 * 
 * Use Button for all primary and secondary actions in the application.
 * Choose the variant based on the action's importance.
 * 
 * Available variants:
 * - primary: For main actions (submit, save, create)
 * - secondary: For less important actions
 * - danger: For destructive actions (delete, remove)
 * - success: For positive outcomes
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleSubmit}>
 *   Save Changes
 * </Button>
 * ```
 * 
 * @example
 * ```tsx
 * <Button variant="danger" disabled>
 *   Delete (Disabled)
 * </Button>
 * ```
 */
```

### 3. Styling

Create a corresponding SCSS file with the same name:

```scss
// src/components/ui/ComponentName.scss

.component-name {
  // Use design tokens for consistency
  padding: 1rem;
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.5;
  
  // Use Bootstrap variables
  @media (max-width: map-get($grid-breakpoints, sm)) {
    padding: 0.75rem;
  }
  
  // Handle variants
  &--primary {
    background-color: var(--bs-primary);
    color: white;
  }
  
  &--secondary {
    background-color: var(--bs-secondary);
    color: white;
  }
  
  // Handle states
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

### 4. TypeScript Types

All props must be properly typed:

```tsx
interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary content of the component */
  children: React.ReactNode;
  
  /** Variant style of the component */
  variant?: 'primary' | 'secondary' | 'danger';
  
  /** Size of the component */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether the component is disabled */
  disabled?: boolean;
  
  /** Callback when component is clicked */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}
```

### 5. Export Component

Add the component to the index file:

```tsx
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { ComponentName } from './ComponentName';
```

## Component Checklist

Before submitting a new component, ensure:

- [ ] Component has proper TypeScript interfaces for all props
- [ ] Component includes JSDoc comments with examples
- [ ] Component has corresponding SCSS styling
- [ ] Component is accessible (ARIA labels, keyboard navigation)
- [ ] Component is responsive (works on mobile, tablet, desktop)
- [ ] Component handles edge cases (empty content, disabled state, loading)
- [ ] Component is exported from `src/components/ui/index.ts`
- [ ] Styleguidist example section exists and shows usage
- [ ] Component follows naming conventions (PascalCase for components)

## Adding Component Examples

Create `.md` files in the component directory for additional documentation:

```markdown
// src/components/ui/ComponentName.md

## Component Description

Detailed description and usage guidelines.

## Basic Usage

\`\`\`tsx
<ComponentName prop="value">
  Content
</ComponentName>
\`\`\`

## Variants

\`\`\`tsx
<ComponentName variant="primary">Primary</ComponentName>
<ComponentName variant="secondary">Secondary</ComponentName>
\`\`\`

## With Custom Styling

\`\`\`tsx
<ComponentName className="custom-class">
  Styled Content
</ComponentName>
\`\`\`
```

## Accessibility Guidelines

### 1. Semantic HTML
Use appropriate HTML elements:
```tsx
// Good
<button onClick={handleClick}>Click me</button>

// Avoid
<div onClick={handleClick}>Click me</div>
```

### 2. ARIA Labels
```tsx
<button
  aria-label="Save changes"
  aria-pressed={isActive}
>
  Save
</button>
```

### 3. Keyboard Navigation
Ensure components work with keyboard:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
};
```

### 4. Color Contrast
Ensure text on background meets WCAG AA standards (4.5:1 ratio).

## Testing Components

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with children', () => {
    render(<ComponentName>Test Content</ComponentName>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <ComponentName onClick={handleClick}>Click</ComponentName>
    );
    container.querySelector('button')?.click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Code Style

- **Indentation**: 2 spaces
- **Line Length**: Maximum 100 characters
- **Naming**: Use clear, descriptive names
- **Comments**: Add comments for complex logic
- **Imports**: Organize imports alphabetically

Example:
```tsx
import React from 'react';
import classNames from 'classnames';
import { useCallback } from 'react';

import './ComponentName.scss';
```

## Updating Existing Components

When updating components:

1. **Check Breaking Changes** - Ensure backward compatibility
2. **Update Documentation** - Add examples for new features
3. **Update Types** - Update TypeScript interfaces
4. **Test Thoroughly** - Test all affected components
5. **Update CHANGELOG** - Document changes

## Component Design Principles

### 1. Single Responsibility
Each component should do one thing well.

### 2. Composability
Components should work together to form larger UIs.

### 3. Prop-Driven
Configure components through props, not internal state when possible.

### 4. Progressive Enhancement
Components should work without JavaScript (server-side rendering).

### 5. Consistency
Follow established patterns in existing components.

## Pull Request Process

When submitting changes:

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` to check code style
4. Test with `npm run dev`
5. Run `npm run styleguide` to verify documentation
6. Submit a pull request with clear description

## Documentation Standards

### Component README

Each component should have a README explaining:

- What the component does
- When to use it
- Props and their types
- Accessibility features
- Usage examples
- Common patterns

### Inline Comments

```tsx
// Add comments for complex logic
const calculateWidth = () => {
  // Account for padding and borders
  return 100 - (padding * 2) - (borderWidth * 2);
};
```

## Questions?

- Check existing components for patterns
- Review the Design Tokens documentation
- Ask in team discussions
- Refer to React documentation

## Tips for Success

1. Keep components small and focused
2. Write clear, descriptive prop names
3. Include examples in JSDoc comments
4. Test across different browsers
5. Get feedback early and often
6. Document as you code
7. Think about reusability

Thank you for improving the component library! Your contributions make the application better for everyone. 🎉
