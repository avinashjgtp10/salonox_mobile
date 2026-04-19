# Getting Started with Components

This guide will help you get started using components from the Salon Management System component library in your application.

## Installation

First, ensure you have the project set up with all dependencies:

```bash
npm install
```

## Importing Components

All UI components are located in the `src/components/ui/` directory. Import components into your pages or other components like this:

```tsx
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
```

## Basic Button Usage

The Button component is the most fundamental building block:

```tsx
import { Button } from '@/components/ui/Button';

export function MyComponent() {
  return (
    <Button onClick={() => alert('Clicked!')}>
      Click Me
    </Button>
  );
}
```

### Button Variants

Use the `variant` prop to change the button style:

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Danger</Button>
<Button variant="warning">Warning</Button>
<Button variant="info">Info</Button>
```

### Button Sizes

Use the `size` prop to change the button size:

```tsx
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

## Input Forms

The Input component provides a consistent form input experience:

```tsx
import { Input } from '@/components/ui/Input';
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </>
  );
}
```

## Cards - Content Containers

Use Card components to group related content:

```tsx
import { Card } from '@/components/ui/Card';

export function ServiceCard() {
  return (
    <Card>
      <h3>Hair Cutting</h3>
      <p>Professional hair cutting service</p>
      <p>$25.00</p>
    </Card>
  );
}
```

## Data Display with Tables

Use the Table component for displaying tabular data:

```tsx
import { Table } from '@/components/ui/Table';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

const data = [
  { name: 'John Doe', email: 'john@example.com', phone: '555-0123' },
  { name: 'Jane Smith', email: 'jane@example.com', phone: '555-0456' },
];

export function ClientList() {
  return <Table columns={columns} data={data} />;
}
```

## Modals - Dialog Windows

Use Modal for displaying dialogs:

```tsx
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';

export function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2>Confirm Action</h2>
        <p>Are you sure you want to proceed?</p>
        <Button onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </Modal>
    </>
  );
}
```

## Loading States

Use loading components for async operations:

```tsx
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useState, useEffect } from 'react';

export function DataFetchComponent() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simulate data fetch
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  return (
    <>
      {isLoading && <PageLoader />}
      <div>Content loaded</div>
    </>
  );
}
```

## Badges - Status Indicators

Use Badge components to indicate status:

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Inactive</Badge>
```

## Working with Dividers

Use Divider to visually separate content:

```tsx
import { Divider } from '@/components/ui/Divider';

<Card>
  <h3>Appointment Details</h3>
  <Divider />
  <p>Date: March 15, 2024</p>
  <p>Time: 10:00 AM</p>
</Card>
```

## Best Practices

### 1. **Use Semantic HTML**
Always use appropriate HTML elements within components for better accessibility and SEO.

### 2. **Prop Validation**
All components have TypeScript types defined. Use these types for better IDE support and type checking.

### 3. **Accessibility**
Our components include:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility

### 4. **Responsive Design**
Components are responsive by default. Use Bootstrap's responsive utilities:

```tsx
<div className="d-none d-md-block">
  {/* Shown only on medium screens and above */}
</div>
```

### 5. **Theming**
Components inherit Bootstrap theme variables. Customize colors by overriding CSS variables:

```css
:root {
  --primary: #007bff;
  --secondary: #6c757d;
}
```

### 6. **Performance**
- Memoize components when needed using `React.memo()`
- Use `useCallback` for frequently changing event handlers
- Lazy load components using `React.lazy()` for large components

## Common Patterns

### Form Submission

```tsx
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';

export function ContactForm() {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submission
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <Button type="submit">Submit</Button>
      {submitted && <p>Thank you!</p>}
    </form>
  );
}
```

### Conditional Rendering

```tsx
export function StatusDisplay({ status }: { status: 'loading' | 'success' | 'error' }) {
  return (
    <>
      {status === 'loading' && <PageLoader />}
      {status === 'success' && <Badge variant="success">Ready</Badge>}
      {status === 'error' && <Badge variant="danger">Failed</Badge>}
    </>
  );
}
```

## Troubleshooting

### Components Not Appearing?
- Check that the import path is correct: `@/components/ui/`
- Verify the component name matches exactly (case-sensitive)
- Ensure all dependencies are installed with `npm install`

### Styling Issues?
- Check that Bootstrap CSS is loaded
- Verify SCSS is compiled correctly
- Check for CSS specificity conflicts

### TypeScript Errors?
- Ensure you're using the correct prop types
- Check the component's `.tsx` file for the interface definition
- Use your IDE's autocomplete to see available props

## Next Steps

1. Explore the component library to understand available components
2. Review the design tokens documentation for consistent styling
3. Follow the contributing guide to add new components
4. Set up your development environment with `npm run dev`

For more help, check the component-specific documentation by clicking on components in this style guide.
