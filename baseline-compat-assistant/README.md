### Baseline Compat Assistant (VS Code Extension)

Improve cross‑browser confidence directly in your editor. Baseline Compat Assistant scans your workspace and your JSX/TSX styling for Baseline compatibility issues and surfaces them as diagnostics, plus an information side panel for quick lookups.

### Features

- **JSX/TSX style analysis**: Parses React files to extract Tailwind CSS classes, styled‑components (library support for `styled-components`), and inline `style` props to check their resulting CSS against Baseline data.
- **Real‑time diagnostics**: Lints HTML, CSS, and JavaScript files using ESLint Baseline integrations and shows diagnostic squiggles and messages.
- **Workspace‑wide scanning**: Run a scan across your project to aggregate all compatibility issues into a single, interactive view.
- **Informative sidebar**: A React webview panel lets you search for a web feature by name or ID and view browser support without leaving VS Code.
- **Browserslist sync**: Watches your project’s `.browserslistrc` and syncs it for accurate diagnostics.

### Commands

- `Baseline Compat Assistant: Generate Baseline Config Files` (`baseline-compat-assistant.generateEslintConfig`)
  - Creates `baseline-compat.config.mjs` and `.browserslistrc` at your workspace root.
- `Baseline Compat Assistant: Scan Workspace for Compatibility Issues` (`baseline-compat-assistant.scanWorkspace`)
  - Scans `**/*.{js,jsx,html,css}` (excluding common build folders) and aggregates issues.
- `Baseline Compat Assistant: Run ESLint on HTML` (`baseline-compat-assistant.lintHtml`)
  - Runs ESLint Baseline rules on the current/selected HTML file.
- `Baseline Compat Assistant: Show Info Panel` (`baseline-compat-assistant.showInfoPanel`)
  - Opens the sidebar/webview to query web‑feature support.
- `Baseline: Learn More` (`baseline-compat-assistant.learnMore`)
  - Jumps the sidebar to a specific feature ID from a diagnostic.

### Views

- `Compatibility Issues` tree view in the Explorer (`compatibilityIssuesView`):
  - Lists all discovered issues; click an item to navigate to the source location.

### Activation

The extension activates on common web languages: plaintext, HTML, CSS, JavaScript/TypeScript, and React (`.jsx`/`.tsx`). Diagnostics are refreshed on save, on editor change, and once on initial load.

### How to use

1. Run `Generate Baseline Config Files` to scaffold `baseline-compat.config.mjs` and `.browserslistrc` in your project.
2. Open or edit files. Diagnostics appear inline and in the `Compatibility Issues` view.
3. Use `Scan Workspace for Compatibility Issues` to get a consolidated report.
4. Open `Show Info Panel` and search by feature name or ID, or click `Learn More` from a diagnostic.

### Tailwind, styled‑components, and inline CSS details

- Tailwind utility classes from JSX/TSX are compiled (via PostCSS + Tailwind JIT) into CSS, then checked against Baseline.
- `styled-components` blocks and inline style objects are parsed, and their CSS properties/selectors are checked.

### Requirements

- VS Code 1.104.0 or newer
- A project with web source files (`.html`, `.css`, `.js`, `.jsx`, `.ts`, `.tsx`)
- Optional: a `.browserslistrc` at your workspace root (the extension can generate one)

### Known limitations

- Styled CSS parsing focuses on properties and selectors. Advanced CSS grammar beyond that may not be fully analyzed.
- Tailwind coverage for custom themes/variants/arbitrary values is evolving.

### Support and feedback

Issues and feature requests: open an issue on the project’s GitHub repository.
