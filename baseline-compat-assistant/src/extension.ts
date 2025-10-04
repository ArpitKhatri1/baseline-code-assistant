import * as vscode from "vscode";
import * as path from "path";
import { babelParser, parsedSelectors } from "./parsers/babel";
import { syncBrowserConfig } from "./lib/helpers";
import { ESLint } from "eslint";
import { ParsedSelector, parsedDeclarations } from "./parsers/babel";
import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
  rawCSSType,
} from "./types/types";
import { addDiagnosticRange } from "./diagonistic";
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

// Change the function to return the diagnostics it finds
export async function runEslintOnHtml(
  fileUri: vscode.Uri
): Promise<DiagnosticIssue[]> {
  const allIssues: DiagnosticIssue[] = [];
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) return [];

    const projectRootPath = workspaceFolder.uri.fsPath;
    const eslint = new ESLint({ cwd: projectRootPath });
    const results = await eslint.lintFiles([fileUri.fsPath]);

    // (Optional) You can still write to the output channel for debugging
    // ...

    for (const result of results) {
      if (result.filePath !== fileUri.fsPath) continue;

      for (const message of result.messages) {
        const startLine = message.line - 1;
        const startChar = message.column - 1;
        const endLine = message.endLine ? message.endLine - 1 : startLine;
        const endChar = message.endColumn
          ? message.endColumn - 1
          : startChar + 1;

        const range = new vscode.Range(startLine, startChar, endLine, endChar);
        const diagnostic = new vscode.Diagnostic(
          range,
          message.message,
          vscode.DiagnosticSeverity.Warning
        );
        const document = await vscode.workspace.openTextDocument(fileUri);
        for (const result of results) {
          for (const message of result.messages) {
            const startPos = document.offsetAt(
              new vscode.Position(message.line - 1, message.column - 1)
            );
            const endLine = message.endLine
              ? message.endLine - 1
              : message.line - 1;
            const endChar = message.endColumn
              ? message.endColumn - 1
              : message.column;
            const endPos = document.offsetAt(
              new vscode.Position(endLine, endChar)
            );

            console.log(message.message);
            await addDiagnosticRange(
              document,
              startPos,
              endPos,
              message.message
            );
          }
        }
        allIssues.push({ uri: fileUri, diagnostic });
      }
    }
  } catch (error) {
    console.error(
      `An error occurred in runEslintOnHtml for ${fileUri.fsPath}:`,
      error
    );
  }
  return allIssues;
}

// export async function runEslintOnHtml(fileUri: vscode.Uri) {
//   try {
//     const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
//     if (!workspaceFolder) {
//       vscode.window.showErrorMessage(
//         "Could not find a workspace for the file."
//       );
//       return;
//     }
//     const projectRootPath = workspaceFolder.uri.fsPath;
//     console.log("eslint project root path", projectRootPath);

//     const eslint = new ESLint({
//       cwd: projectRootPath,
//     });

//     const results = await eslint.lintFiles([fileUri.fsPath]);

//     const outputChannel = vscode.window.createOutputChannel("eslint");
//     outputChannel.appendLine(JSON.stringify(results,null,2));
//     outputChannel.show(true);
//     const document = await vscode.workspace.openTextDocument(fileUri);

//     for (const result of results) {
//       for (const message of result.messages) {
//         const startPos = document.offsetAt(new vscode.Position(message.line - 1, message.column - 1));
//         const endLine = message.endLine ? message.endLine - 1 : message.line - 1;
//         const endChar = message.endColumn ? message.endColumn - 1 : message.column;
//         const endPos = document.offsetAt(new vscode.Position(endLine, endChar));

//         console.log(message.message);
//         await addDiagnosticRange(document, startPos, endPos, message.message);
//       }
//     }
//   } catch (error) {
//     console.error("An error occurred in runEslintOnHtml:", error);
//   }
// }

export function activate(context: vscode.ExtensionContext) {
  const diagnosticsProvider = new DiagnosticsTreeDataProvider();
  vscode.window.createTreeView("compatibilityIssuesView", {
    treeDataProvider: diagnosticsProvider,
  });

  // 2. Register the new "Scan Workspace" command
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
            "**/{node_modules,dist,venv,.venv,out,build}/**" // <-- UPDATED LINE
          );

          let processedFiles = 0;
          for (const file of files) {
            if (token.isCancellationRequested) break;

            progress.report({
              message: `Scanning ${path.basename(file.fsPath)}`,
              increment: 100 / files.length,
            });

            // You'll need similar logic for your babelParser for JSX files
            const issues = await runEslintOnHtml(file);
            allIssues.push(...issues);
            processedFiles++;
          }

          // Update the TreeView with all the collected issues
          diagnosticsProvider.refresh(allIssues);
          vscode.window.showInformationMessage(
            `Scan complete. Found ${allIssues.length} issues in ${processedFiles} files.`
          );
        }
      );
    }
  );

  context.subscriptions.push(scanWorkspaceCommand);

  // 1. Perform the initial sync when the extension activates
  (async () => {
    try {
      // 1. Perform the initial sync when the extension activates
      await syncBrowserConfig();

      // 2. Watch for any changes to the .browserslistrc file
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

      // Add the watcher to subscriptions for proper cleanup
      context.subscriptions.push(watcher);
    } catch (error) {
      console.error("Error during async activation:", error);
      vscode.window.showErrorMessage(
        "Baseline Assistant failed to initialize."
      );
    }
  })();

  console.log(vscode.workspace.workspaceFolders);
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
    () => {
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
            vscode.Uri.file(
              path.join(context.extensionPath, "react-sidepanel", "dist")
            ),
          ],
        }
      );

      const devServerUrl = "http://localhost:5173";
      panel.webview.html = getWebviewContent(devServerUrl);

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

function getWebviewContent(url: string) {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body, iframe {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            border: none;
          }
        </style>
        <title>Web Baseline Status</title>
      </head>
      <body>
        <iframe id="react-frame" src="${url}"></iframe>
        <script>
          (function() {
            const iframe = document.getElementById("react-frame");
            window.addEventListener("message", (event) => {
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(event.data, "*");
              }
            });
          })();
        </script>
      </body>
    </html>
  `;
}

export function deactivate() {}
