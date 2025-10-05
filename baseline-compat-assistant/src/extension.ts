import * as vscode from "vscode";
import * as path from "path";
import {
  babelParser,
  parsedSelectors,
  parsedDeclarations,
} from "./parsers/babel";
import { runEslintOnHtml, syncBrowserConfig } from "./lib/helpers";
import axios from "axios";
import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
  rawCSSType,
} from "./types/types";

import {
  DiagnosticIssue,
  DiagnosticsTreeDataProvider,
} from "./lib/DiagonsticTreeProvider"; // Import the type

let infoPanel: vscode.WebviewPanel | undefined = undefined;
export let diagnosticsCollection: vscode.DiagnosticCollection;
export const classRanges: ClassRangeType[] = [];
export const tagNames: TagNameRangeType[] = [];
export const attributes: AttributePropType[] = [];
export const eventHandlers: EventHandlerPropType[] = [];
export const styledComponents: rawCSSType[] = [];
export const inlineComponents: rawCSSType[] = [];
let isParsing = false;
let debounceTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  const diagnosticsProvider = new DiagnosticsTreeDataProvider();
  vscode.window.createTreeView("compatibilityIssuesView", {
    treeDataProvider: diagnosticsProvider,
  });

  const generateEslintConfigCommand = vscode.commands.registerCommand(
    "baseline-compat-assistant.generateEslintConfig",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Please open a project folder to generate the necessary config files."
        );
        return;
      }

      const rootPath = workspaceFolders[0].uri;
      // Define paths for both configuration files.
      const eslintConfigPath = vscode.Uri.joinPath(
        rootPath,
        "baseline-compat.config.mjs"
      );
      const browserslistConfigPath = vscode.Uri.joinPath(
        rootPath,
        ".browserslistrc"
      );

      // --- Content for both files ---
      const eslintConfigContent = `import globals from "globals";
import css from "@eslint/css";
import html from "@html-eslint/eslint-plugin";
import compat from "eslint-plugin-compat";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: ["**/*.css"],
    plugins: {
      css,
    },
    language: "css/css",
    rules: {
      "css/use-baseline": ["warn", {
        "available": "widely"
      }],
    },
  },
  {
    ...html.configs["flat/recommended"],
    files: ["**/*.html"],
    rules: {
      "@html-eslint/use-baseline": ["warn", {
        "available": "widely"
      }],
    },
  },
  {
    ...compat.configs["flat/recommended"],
    settings: {
      "lintAllEsApis": true,
    },
    rules: {
      "compat/compat": ["warn"],
    },
  },
];
`;
      const browserslistConfigContent = `chrome >= 115
and_chr >= 115
edge >= 115
firefox >= 115
and_ff >= 115
safari >= 20
ios_saf >= 20`;

      // --- Overwrite checks for both files ---
      try {
        await vscode.workspace.fs.stat(eslintConfigPath);
        const overwrite = await vscode.window.showWarningMessage(
          "baseline-compat.config.mjs already exists. Do you want to overwrite it?",
          { modal: true },
          "Overwrite"
        );
        if (overwrite !== "Overwrite") {
          vscode.window.showInformationMessage(
            "Configuration generation cancelled."
          );
          return;
        }
      } catch {
        // ESLint config does not exist, so no need to ask for overwrite.
      }

      try {
        await vscode.workspace.fs.stat(browserslistConfigPath);
        const overwrite = await vscode.window.showWarningMessage(
          ".browserslistrc already exists. Do you want to overwrite it?",
          { modal: true },
          "Overwrite"
        );
        if (overwrite !== "Overwrite") {
          vscode.window.showInformationMessage(
            "Configuration generation cancelled."
          );
          return;
        }
      } catch {
        // .browserslistrc does not exist, so no need to ask for overwrite.
      }

      // --- Write both files ---
      await vscode.workspace.fs.writeFile(
        eslintConfigPath,
        Buffer.from(eslintConfigContent, "utf8")
      );
      await vscode.workspace.fs.writeFile(
        browserslistConfigPath,
        Buffer.from(browserslistConfigContent, "utf8")
      );

      // --- Final confirmation and open ESLint config ---
      vscode.window.showInformationMessage(
        "Successfully created baseline-compat.config.mjs and .browserslistrc"
      );
      
      const doc = await vscode.workspace.openTextDocument(eslintConfigPath);
      await vscode.window.showTextDocument(doc);
    }
  );
  context.subscriptions.push(generateEslintConfigCommand);

  const scanWorkspaceCommand = vscode.commands.registerCommand(
    "baseline-compat-assistant.scanWorkspace",
    async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Scanning workspace for compatibility issues...",
          cancellable: true,
        },
        async (progress, token) => {
          const allIssues: DiagnosticIssue[] = [];

          const files = await vscode.workspace.findFiles(
            "**/*.{js,jsx,html,css}",
            "**/{node_modules,dist,venv,.venv,out,build}/**"
          );

          let processedFiles = 0;
          for (const file of files) {
            if (token.isCancellationRequested) break;

            progress.report({
              message: `Scanning ${path.basename(file.fsPath)}`,
              increment: 100 / files.length,
            });

            const issues = await runEslintOnHtml(file);
            allIssues.push(...issues);
            processedFiles++;
          }

          diagnosticsProvider.refresh(allIssues);
          vscode.window.showInformationMessage(
            `Scan complete. Found ${allIssues.length} issues in ${processedFiles} files.`
          );
        }
      );
    }
  );
  context.subscriptions.push(scanWorkspaceCommand);

  (async () => {
    try {
      await syncBrowserConfig();
      const watcher =
        vscode.workspace.createFileSystemWatcher("**/.browserslistrc");
      watcher.onDidCreate(async () => {
        console.log(".browserslistrc was created. Syncing config...");
        await syncBrowserConfig();
      });
      watcher.onDidChange(async () => {
        console.log(".browserslistrc was modified. Syncing config...");
        await syncBrowserConfig();
      });
      context.subscriptions.push(watcher);
    } catch (error) {
      console.error("Error during async activation:", error);
      vscode.window.showErrorMessage(
        "Baseline Assistant failed to initialize."
      );
    }
  })();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "baseline-compat-assistant.lintHtml",
      async (uri: vscode.Uri) => {
        if (!uri) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            uri = editor.document.uri;
          }
        }
        if (uri) {
          await runEslintOnHtml(uri);
        } else {
          vscode.window.showWarningMessage("Please select an HTML file.");
        }
      }
    )
  );

  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "Unsupported Features"
  );
  context.subscriptions.push(diagnosticsCollection);

  vscode.workspace.onDidSaveTextDocument(triggerParse);
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      triggerParse(editor.document);
    }
  });

  if (vscode.window.activeTextEditor) {
    triggerParse(vscode.window.activeTextEditor.document);
  }

  const showInfoPanelDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.showInfoPanel",
    async () => {
      if (infoPanel) {
        infoPanel.reveal(vscode.ViewColumn.Beside);
        return infoPanel;
      }

      const panel = vscode.window.createWebviewPanel(
        "infoPanel",
        "Web Baseline Status",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(
              context.extensionUri,
              "react-sidepanel",
              "dist"
            ),
          ],
        }
      );

      panel.webview.html = await getWebviewContent(
        panel.webview,
        context.extensionUri
      );

      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "fetchApiData":
              try {
                const response = await axios.get(message.url);
                panel.webview.postMessage({
                  command: "apiDataResponse",
                  data: response.data,
                });
              } catch (error) {
                panel.webview.postMessage({
                  command: "apiDataResponse",
                  error: (error as Error).message,
                });
              }
              return;
          }
        },
        undefined,
        context.subscriptions
      );

      infoPanel = panel;

      panel.onDidDispose(
        () => {
          infoPanel = undefined;
        },
        null,
        context.subscriptions
      );

      return infoPanel;
    }
  );
  context.subscriptions.push(showInfoPanelDisposable);

  const learnMoreDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.learnMore",
    async (featureId: string) => {
      const panel = await vscode.commands.executeCommand<vscode.WebviewPanel>(
        "baseline-compat-assistant.showInfoPanel"
      );

      console.log(`Sending featureId to panel: ${featureId}`);

      if (panel) {
        setTimeout(() => {
          panel.webview.postMessage({
            command: "updateQuery",
            query: featureId,
          });
        }, 200);
      }
    }
  );
  context.subscriptions.push(learnMoreDisposable);
}

function triggerParse(document: vscode.TextDocument) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    if (isParsing) {
      console.log("Parser is busy, skipping this run.");
      return;
    }
    parseFile(document);
  }, 300);
}

async function parseFile(document: vscode.TextDocument) {
  isParsing = true;

  try {
    classRanges.length = 0;
    tagNames.length = 0;
    attributes.length = 0;
    eventHandlers.length = 0;
    styledComponents.length = 0;
    inlineComponents.length = 0;
    parsedSelectors.length = 0;
    parsedDeclarations.length = 0;
    diagnosticsCollection.delete(document.uri);

    if (
      document.fileName.endsWith(".jsx") ||
      document.fileName.endsWith(".tsx")
    ) {
      await babelParser(document);
    }

    if (
      document.fileName.endsWith(".html") ||
      document.fileName.endsWith(".js") ||
      document.fileName.endsWith(".css")
    ) {
      await runEslintOnHtml(document.uri);
    }

    console.log(`Parsing complete for: ${path.basename(document.fileName)}`);
  } catch (error) {
    console.error("An error occurred during parsing:", error);
    vscode.window.showErrorMessage(
      "Baseline Assistant: An error occurred while parsing the file."
    );
  } finally {
    isParsing = false;
  }
}

async function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): Promise<string> {
  const buildPath = vscode.Uri.joinPath(
    extensionUri,
    "react-sidepanel",
    "dist"
  );
  const indexPath = vscode.Uri.joinPath(buildPath, "index.html");
  const indexHtmlBytes = await vscode.workspace.fs.readFile(indexPath);
  let indexHtml = new TextDecoder().decode(indexHtmlBytes);

  indexHtml = indexHtml.replace(
    /(href|src)="(\/[^"]+)"/g,
    (match, attribute, assetPath) => {
      const assetUriOnDisk = vscode.Uri.joinPath(
        buildPath,
        assetPath.substring(1)
      );
      const assetWebviewUri = webview.asWebviewUri(assetUriOnDisk);
      return `${attribute}="${assetWebviewUri}"`;
    }
  );

  const cspSource = webview.cspSource;
  const apiDomain = "https://api.webstatus.dev";

  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${cspSource} 'unsafe-inline';
        script-src ${cspSource};
        img-src ${cspSource} data:;
        connect-src ${apiDomain};
    ">`;

  indexHtml = indexHtml.replace("<head>", `<head>${cspMetaTag}`);

  return indexHtml;
}

export function deactivate() {}
