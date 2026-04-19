module.exports = {
  // Project information
  title: 'Salon Management System - Component Library',
  description: 'Interactive component style guide and documentation',
  version: require('./package.json').version,

  // Component paths and patterns
  components: 'src/components/ui/*.tsx',
  
  // Sections for organizing documentation
  sections: [
    {
      name: 'Introduction',
      content: 'styleguide-docs/introduction.md',
    },
    {
      name: 'UI Components',
      description: 'Core UI components used throughout the application',
      components: 'src/components/ui/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand',
    },
    {
      name: 'Layout Components',
      description: 'Layout and structural components',
      components: 'src/components/ui/SplitLayout.tsx',
    },
    {
      name: 'Form Components',
      description: 'Form inputs and related components',
      components: ['src/components/ui/Input.tsx', 'src/components/ui/Button.tsx'],
    },
    {
      name: 'Data Display',
      description: 'Components for displaying data',
      components: ['src/components/ui/Table.tsx', 'src/components/ui/Card.tsx', 'src/components/ui/Badge.tsx'],
    },
    {
      name: 'Feedback Components',
      description: 'Components for user feedback',
      components: ['src/components/ui/Modal.tsx', 'src/components/ui/FullScreenLoader.tsx', 'src/components/ui/PageLoader.tsx'],
    },
    {
      name: 'Design Tokens',
      content: 'styleguide-docs/design-tokens.md',
    },
    {
      name: 'Getting Started',
      content: 'styleguide-docs/getting-started.md',
    },
    {
      name: 'Contributing',
      content: 'styleguide-docs/contributing.md',
    },
  ],

  // Server configuration
  serverPort: 6060,
  
  // Webpack configuration overrides
  webpackConfig: {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
            },
          },
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset',
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': require('path').resolve(__dirname, 'src/'),
      },
    },
  },

  // Component paths and patterns for better organization
  skipComponentsWithoutExample: false,
  
  // Styleguide styling
  styles: {
    StyleGuide: {
      '@global body': {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        fontSize: '14px',
      },
    },
  },

  // Customize output
  template: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0',
        },
        {
          name: 'theme-color',
          content: '#ffffff',
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        },
      ],
    },
  },

  // Improve build performance
  propsParser: require('react-docgen-typescript').withDefaultConfig([
    'tsconfig.json',
  ]).parse,

  // Mount point ID
  mountPointId: 'rsg-root',

  // Enable hash routing for better navigation
  pagePerSection: true,
  getComponentPathLine(componentPath) {
    const name = componentPath
      .split('/')
      .pop()
      .replace(/\.tsx?$/, '');
    const folder = componentPath.split('/').slice(-2, -1)[0];
    return `import { ${name} } from '@/components/${folder}';`;
  },
};
