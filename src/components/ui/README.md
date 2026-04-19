# UI Components Guide

This directory contains all reusable UI components for the Salon Management System.

## Component Overview

### Basic Components

- **Button** - Primary action component with multiple variants and sizes
- **Input** - Form input with label, error handling, and icon support
- **Card** - Container component for grouping related content
- **Badge** - Status indicator component

### Data Display Components

- **Table** - Tabular data display with sorting and pagination
- **Divider** - Visual separator between content sections

### Layout Components

- **SplitLayout** - Two-column layout for side-by-side content

### Feedback Components

- **Modal** - Dialog component for important interactions
- **FullScreenLoader** - Full-screen loading indicator
- **PageLoader** - Page-level loading indicator

### Download Components

- **DownloadButton** - Button component with download functionality

## Component Organization

```
src/components/ui/
├── Button.tsx              # Primary action button
├── Input.tsx               # Form input
├── Card.tsx                # Content container
├── Badge.tsx               # Status indicator
├── Table.tsx               # Data display
├── Modal.tsx               # Dialog
├── Divider.tsx             # Visual separator
├── FullScreenLoader.tsx    # Full-screen loading
├── PageLoader.tsx          # Page loading indicator
├── DownloadButton.tsx      # Download button
├── SplitLayout.tsx         # Two-column layout
└── index.ts                # Component exports
```

## Usage Examples

### Button Component

```tsx
import { Button } from '@/components/ui';

// Basic button
<Button>Click Me</Button>

// With variant
<Button variant="success">Save Changes</Button>

// With size
<Button size="lg">Large Button</Button>

// With icon
<Button iconLeft={<Icon />}>Action</Button>

// Loading state
<Button loading>Loading...</Button>

// Disabled state
<Button disabled>Disabled</Button>
```

### Input Component

```tsx
import { Input } from '@/components/ui';

// Basic input
<Input type="text" placeholder="Enter text" />

// With label
<Input label="Email" type="email" />

// With error
<Input label="Password" type="password" error="Password too short" />

// Textarea
<Input multiline rows={5} placeholder="Enter message" />

// With icon
<Input iconLeft={<Icon />} placeholder="Search..." />
```

### Card Component

```tsx
import { Card } from '@/components/ui';

<Card>
  <h3>Service Details</h3>
  <p>Hair Cutting Service</p>
  <p>$25.00</p>
</Card>
```

### Table Component

```tsx
import { Table } from '@/components/ui';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

const data = [
  { name: 'John', email: 'john@example.com' },
];

<Table columns={columns} data={data} />
```

### Modal Component

```tsx
import { Modal } from '@/components/ui';

<Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
  <p>Are you sure?</p>
</Modal>
```

## Component Props Reference

For detailed information about component props, see individual component files or run:

```bash
npm run styleguide
```

This will launch an interactive documentation site showing all components with their props and examples.

## Type Safety

All components are fully typed with TypeScript. Use your IDE's autocomplete to discover available props:

```tsx
import { Button } from '@/components/ui/Button';
import type { ButtonProps } from '@/components/ui/Button';

// Use type inference
const MyComponent: React.FC<{ buttonProps?: ButtonProps }> = ({ buttonProps }) => {
  return <Button {...buttonProps}>Click</Button>;
};
```

## Styling

Components use Bootstrap CSS for styling. Customize appearance by:

1. **Bootstrap Variables** - Override in your SCSS
2. **Component Props** - Use the `className` prop
3. **CSS Custom Properties** - Override global CSS variables

### Example: Custom Styling

```tsx
import { Button } from '@/components/ui';
import './CustomButton.scss';

<Button className="custom-button-style">Click</Button>
```

```scss
// CustomButton.scss
.custom-button-style {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}
```

## Accessibility

All components include accessibility features:

- **Semantic HTML** - Proper HTML elements for screen readers
- **ARIA Labels** - Labels for assistive technologies
- **Keyboard Navigation** - Support for keyboard users
- **Color Contrast** - WCAG AA compliant colors

## Common Patterns

### Form Handling

```tsx
import { Button, Input } from '@/components/ui';
import { useState } from 'react';

export function Form() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // API call
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        name="name"
        label="Name"
        value={formData.name}
        onChange={handleChange}
      />
      <Input
        name="email"
        type="email"
        label="Email"
        value={formData.email}
        onChange={handleChange}
      />
      <Button type="submit" loading={loading}>
        Submit
      </Button>
    </form>
  );
}
```

### Conditional Rendering

```tsx
import { FullScreenLoader, PageLoader } from '@/components/ui';

export function DataComponent({ isLoading, isFull }: Props) {
  if (isLoading && isFull) {
    return <FullScreenLoader />;
  }

  return (
    <div>
      {isLoading && <PageLoader />}
      <Content />
    </div>
  );
}
```

## Advanced Component Development

### Creating Custom Components with Base Components

```tsx
import { Button, Card, Input } from '@/components/ui';
import React from 'react';

export const LoginCard: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  return (
    <Card className="login-card">
      <h2>Login</h2>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button fullWidth loading={loading}>
        Sign In
      </Button>
    </Card>
  );
};
```

## Best Practices

1. **Always use TypeScript types**
2. **Provide prop descriptions in JSDoc comments**
3. **Test components in isolation**
4. **Use semantic HTML**
5. **Follow accessibility guidelines**
6. **Keep components small and focused**
7. **Avoid prop drilling - use context for shared state**
8. **Use design tokens for consistency**

## Contributing

See [Contributing Guide](../../styleguide-docs/contributing.md) for instructions on:

- Adding new components
- Updating existing components
- Writing component documentation
- Testing components
- Following code style

## Resources

- [Bootstrap Documentation](https://getbootstrap.com/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Troubleshooting

### Components Not Styling Correctly?
- Ensure Bootstrap CSS is imported
- Check for CSS specificity issues
- Verify component className props

### TypeScript Errors?
- Check prop interfaces in component files
- Use IDE autocomplete to see available props
- Verify type imports

### Performance Issues?
- Memoize components with `React.memo()`
- Use `useCallback` for event handlers
- Check for unnecessary re-renders

Need help? Check individual component files for detailed documentation.
