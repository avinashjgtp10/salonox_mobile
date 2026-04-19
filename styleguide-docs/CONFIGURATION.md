# Styleguide Configuration

This file contains environment and configuration settings for the React Styleguidist setup.

## Styleguidist Server

- **Port**: 6060
- **URL**: http://localhost:6060
- **Auto-reload**: Enabled (hot module reloading)

## Build Settings

- **Output Directory**: `styleguide/` (generated on build)
- **Build Command**: `npm run styleguide:build`
- **Dev Command**: `npm run styleguide`

## Component Discovery

- **Pattern**: `src/components/ui/*.tsx`
- **Parser**: react-docgen-typescript
- **Type Config**: Using tsconfig.json

## Documentation Structure

```
styleguide-docs/
├── README.md                  # This file
├── introduction.md            # Project overview
├── design-tokens.md          # Design system documentation
├── getting-started.md        # User guide
├── contributing.md           # Contribution guidelines
└── QUICK-REFERENCE.md        # Quick reference guide
```

## Build Performance

- **Initial Build**: ~30-60 seconds
- **Hot Reload**: <2 seconds
- **Memory Usage**: ~500MB

## Supported File Types

- `.tsx` - TypeScript React components
- `.md` - Markdown documentation
- `.scss` - SCSS styles
- `.css` - CSS styles
- Image files (`.png`, `.jpg`, `.svg`)

## Bootstrap Integration

- **Version**: 5.3.0
- **CDN**: jsdelivr.net
- **CSS Variables**: Supported
- **Utilities**: Available for components

## TypeScript Configuration

- **Config File**: tsconfig.json
- **Target**: ES2022
- **Module**: ESNext
- **Strict Mode**: Enabled

## Import Aliases

- `@/` - Maps to `src/`
- `@/components/` - Component imports
- `@/utils/` - Utility functions
- `@/types/` - Type definitions

## Hot Module Reloading

Automatically reloads on changes to:
- Component files (`.tsx`)
- Style files (`.scss`, `.css`)
- Documentation (`.md`)
- Configuration changes (requires manual restart)

## Webpack Configuration

Custom configuration includes:
- TypeScript loader (ts-loader)
- SCSS/CSS loaders
- Asset handling
- Path alias resolution

## Fonts

Primary font stack:
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

## Color Scheme

Uses Bootstrap CSS variables for theming:
- Primary: `var(--bs-primary)`
- Secondary: `var(--bs-secondary)`
- Success: `var(--bs-success)`
- Danger: `var(--bs-danger)`
- And more...

## Responsive Breakpoints

- **Mobile**: 320px - 575px
- **Tablet**: 576px - 991px
- **Desktop**: 992px+

## Cache Directory

- Webpack cache: `./.cache/`
- Clear with: `rm -rf .cache/`

## Ignored Patterns

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- Coverage files

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Workflow

1. Start server: `npm run styleguide`
2. Navigate to http://localhost:6060
3. Edit components in `src/components/ui/`
4. Edit documentation in `styleguide-docs/`
5. Changes reload automatically in browser

## Production Deployment

```bash
# Build static site
npm run styleguide:build

# Output directory
styleguide/

# Deploy to hosting service
# - GitHub Pages
# - Netlify
# - Vercel
# - AWS S3
# - etc.
```

## Troubleshooting

### Port Already in Use
Modify `serverPort` in `styleguide.config.js`

### Components Not Detected
Check glob pattern and file extensions (.tsx)

### Webpack Errors
Clear `.cache/` and restart

### Memory Issues
Increase Node memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run styleguide
```

## Next Steps

1. Review [Quick Reference](QUICK-REFERENCE.md)
2. Read [Getting Started](getting-started.md)
3. Start styleguide: `npm run styleguide`
4. Explore components
5. Add documentation to your components

## Additional Resources

- [Styleguide Configuration Reference](styleguide.config.js)
- [UI Components Guide](../src/components/ui/README.md)
- [Contributing Guide](contributing.md)
- [Design Tokens](design-tokens.md)

---

**Configuration managed in**: `styleguide.config.js`
