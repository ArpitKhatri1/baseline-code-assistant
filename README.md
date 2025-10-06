## BaselineCode Assistant

Real‑time Baseline compatibility guard for modern web projects. This repository contains a VS Code extension that:

- Parses JSX/TSX styling (Tailwind CSS, styled‑components, inline styles) and checks the resulting CSS against Baseline data
- Lints HTML, CSS and JavaScript via ESLint Baseline integrations
- Aggregates issues in a dedicated Explorer view and offers a searchable info panel for quick browser support lookups

### What it does

- JSX/TSX parsing to extract Tailwind classes, `styled-components` CSS, and inline styles; converts them to plain CSS and validates against Baseline
- Real‑time diagnostics on HTML, CSS, and JavaScript files using ESLint rules
- Workspace‑wide scanning and an interactive tree view of issues
- Webview sidebar to search any web feature by name or ID and view support data

### Local setup

Prerequisites:

- Node.js 18+ and pnpm
- VS Code 1.104.0+

Install dependencies:



Build the extension (development): Clone the repository 

```bash
cd baseline-compat-assistant
pnpm install 
pnpm run compile
cd baseline-compat-assistant/react-sidepanel
pnpm install
pnpm run build
```

Launch in VS Code:

1. Open this repository in VS Code
2. Press F5 to launch the Extension Development Host
3. Download these dependencies in the Development Host for eslint to work

```bash
pnpm add -D globals @eslint/css @html-eslint/eslint-plugin eslint eslint-plugin-compact
```

### Using the extension

In the Extension Development Host:

1. Run command “Baseline Compat Assistant: Generate Baseline Config Files” to scaffold `baseline-compat.config.mjs` and `.browserslistrc`
2. Open/edit files; diagnostics appear inline and in the “Compatibility Issues” view
3. Run “Scan Workspace for Compatibility Issues” for a project‑wide report
4. Open “Show Info Panel” to search support for any feature; “Learn More” from diagnostics deep‑links here

### Tailwind integration

Tailwind class lists extracted from JSX/TSX are compiled via PostCSS/Tailwind JIT to plain CSS, then properties/selectors are checked against Baseline.

### Styled components and inline CSS

`styled-components` and inline style objects are parsed to extract CSS properties/selectors for Baseline checks.

### License

See `LICENSE` in this repository.
