# Quick Reference - React Styleguidist

## Commands

```bash
# Start development server (http://localhost:6060)
npm run styleguide

# Build production version
npm run styleguide:build

# Check code quality
npm run lint

# Build application
npm run build

# Start dev server
npm run dev
```

## Common Tasks

### Add a New Component

1. Create component in `src/components/ui/ComponentName.tsx`
2. Add JSDoc comments with examples
3. Export from `src/components/ui/index.ts`
4. Run `npm run styleguide`
5. Component appears in Styleguidist automatically

### Document a Component

```tsx
/**
 * ComponentName - Brief description
 * 
 * Use when... explanation
 * 
 * @example
 * ```tsx
 * <ComponentName prop="value">Content</ComponentName>
 * ```
 */
export const ComponentName: React.FC<ComponentNameProps> = ({ ... }) => {
  // ...
};
```

### Create a Documentation Page

1. Create `.md` file in `styleguide-docs/`
2. Reference in `styleguide.config.js` sections
3. Restart styleguide server

### Deploy Styleguide

```bash
npm run styleguide:build
# Upload styleguide/ folder to hosting service
```

## File Structure Reminder

```
src/components/ui/
├── Button.tsx           ← Component file
├── Button.scss          ← Styles
└── index.ts            ← Exports

styleguide-docs/
├── introduction.md
├── design-tokens.md
├── getting-started.md
└── contributing.md

styleguide.config.js   ← Main configuration
```

## Configuration Quick Reference

### Server Port
```javascript
serverPort: 6060
```

### Component Sections
```javascript
sections: [
  {
    name: 'Component Category',
    components: 'src/components/ui/*.tsx',
  }
]
```

### Props Parser
```javascript
propsParser: require('react-docgen-typescript').withDefaultConfig(['tsconfig.json']).parse
```

## Debugging

### Components Not Showing?
- Verify glob pattern in `styleguide.config.js`
- Check component is properly exported
- Ensure `.tsx` file extension

### Examples Not Working?
- Check JSDoc syntax
- Verify code block formatting
- Look for import errors

### Port Already in Use?
Change port in `styleguide.config.js`:
```javascript
serverPort: 6061  // Use different port
```

## Useful Links

- Styleguide Server: http://localhost:6060
- [React Styleguidist Docs](https://react-styleguidist.js.org/)
- [Component Guide](src/components/ui/README.md)
- [Getting Started](styleguide-docs/getting-started.md)
- [Contributing](styleguide-docs/contributing.md)

## Environment Variables

No special environment variables needed for Styleguidist. Uses existing project setup.

## Performance Notes

- First run may take longer (webpack compilation)
- Hot reload works for component and documentation changes
- Large projects may need webpack optimization

## Next Steps

1. Read [Getting Started](styleguide-docs/getting-started.md)
2. Explore [Component Library](src/components/ui/README.md)
3. Check existing component examples
4. Add JSDoc to components
5. Build and deploy styleguide

---

**Happy documenting!** 🚀
