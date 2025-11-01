# Install Assessment System Dependencies

## Required Packages

Run the following command to install all required dependencies for the assessment system:

```bash
npm install react-markdown remark-gfm rehype-raw @react-pdf/renderer
```

## Package Details

### 1. **react-markdown** (v9.0.1)
- Renders markdown content in React components
- Used for: Question text, explanations, mark schemes
- Lightweight and performant

### 2. **remark-gfm** (v4.0.0)
- GitHub Flavored Markdown plugin
- Adds support for tables, strikethrough, task lists
- Used for: Enhanced markdown formatting

### 3. **rehype-raw** (v7.0.0)
- Allows HTML in markdown
- Used for: Complex question formatting

### 4. **@react-pdf/renderer** (v3.1.14)
- PDF generation for React
- Used for: Exporting custom tests as PDF
- Teacher test builder feature

## Installation Command

```bash
cd "c:\Users\Denny\3D Objects\igcse-simplified\my-app"
npm install react-markdown remark-gfm rehype-raw @react-pdf/renderer
```

## Verify Installation

After installation, verify by checking package.json:

```bash
npm list react-markdown
npm list @react-pdf/renderer
```

## Alternative: Using Yarn

If you prefer yarn:

```bash
yarn add react-markdown remark-gfm rehype-raw @react-pdf/renderer
```

## TypeScript Types

All packages include TypeScript definitions, no additional @types packages needed.

## Next Steps

After installing dependencies:
1. Restart your development server
2. The lint errors will disappear
3. All assessment components will work correctly
