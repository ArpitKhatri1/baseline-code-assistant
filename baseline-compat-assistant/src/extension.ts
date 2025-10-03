import * as vscode from "vscode";
import * as path from "path";
import { babelParser } from "./parsers/babel";
import { ESLint } from "eslint";
import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
  rawCSSType,
} from "./types/types";

// --- Globals ---

// A reference to our webview panel to avoid creating duplicates.
let infoPanel: vscode.WebviewPanel | undefined = undefined;

// Collection to store diagnostics (warnings, errors).
export let diagnosticsCollection: vscode.DiagnosticCollection;

// Arrays to store parsed data from files.
export const classRanges: ClassRangeType[] = [];
export const tagNames: TagNameRangeType[] = [];
export const attributes: AttributePropType[] = [];
export const eventHandlers: EventHandlerPropType[] = [];
export const styledComponents: rawCSSType[] = [];
export const inlineComponents: rawCSSType[] = [];
import globals from "globals";
// import css from "@eslint/css";
import html from "@html-eslint/eslint-plugin";
import compat from "eslint-plugin-compat";

// A locking flag to ensure only one parse operation runs at a time.
let isParsing = false;

// A timer for debouncing parse triggers.
let debounceTimer: NodeJS.Timeout | undefined;

/**
 * The main activation function for the extension.
 * This is called once when the extension is activated.
 * @param context The extension context provided by VS Code.
 */

// export async function runEslintOnHtml(fileUri: vscode.Uri) {
//   // Simply create a new ESLint instance.
//   // It will automatically find and load `eslint.config.js`
//   // from your project's root directory.
//   const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
//   if (!workspaceFolder) {
//     vscode.window.showErrorMessage("Could not find a workspace for the file.");
//     return;
//   }

//   const projectRootPath = workspaceFolder.uri.fsPath;
//   console.log(`✅ Correctly searching for eslint.config.js in: ${projectRootPath}`);

//   // 2. Pass the correct path to the ESLint constructor
//   const eslint = new ESLint({
//     cwd: projectRootPath,
//   });

//   const results = await eslint.lintFiles([fileUri.fsPath]);
//   // The rest of the function remains the same...
//  // New, correct code
// }

export async function runEslintOnHtml(fileUri: vscode.Uri) {
  try {
    // 1. Get the correct project path
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "Could not find a workspace for the file."
      );
      return;
    }
    const projectRootPath = workspaceFolder.uri.fsPath;
    console.log("eslint project root path", projectRootPath);

    // 2. Create the ESLint instance with the correct CWD
    const eslint = new ESLint({
      cwd: projectRootPath,
    });

    // 3. Lint the file
    const results = await eslint.lintFiles([fileUri.fsPath]);

    // 4. Load the formatter by its name
    const formatter = await eslint.loadFormatter("stylish");

    // For debugging: Let's see what the formatter object is
    console.log("Successfully loaded formatter:", formatter);

    const resultText = await formatter.format(results);

    // 5. Show the output
    const outputChannel = vscode.window.createOutputChannel("ESLint");
    outputChannel.clear();
    outputChannel.appendLine(resultText || "No issues found ✅");
    outputChannel.show();
  } catch (error) {
    console.error("An error occurred in runEslintOnHtml:", error);
    // vscode.window.showErrorMessage(`ESLint Error: ${error.message}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
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
  // Setup diagnostics collection.
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "Unsupported Features"
  );
  context.subscriptions.push(diagnosticsCollection);

  // --- Parser Triggers ---
  // We use a debounced trigger for all events to avoid excessive parsing.

  // Run the parser when a file is saved.
  vscode.workspace.onDidSaveTextDocument(triggerParse);

  // Run the parser when the active editor changes.
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      triggerParse(editor.document);
    }
  });

  // Run the parser on the initially active file when VS Code starts.
  if (vscode.window.activeTextEditor) {
    triggerParse(vscode.window.activeTextEditor.document);
  }

  // --- Command Registration ---

  // Command to show the webview panel.
  const showInfoPanelDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.showInfoPanel",
    () => {
      // If the panel already exists, just reveal it and return the instance.
      if (infoPanel) {
        infoPanel.reveal(vscode.ViewColumn.Beside);
        return infoPanel; // ✅ Return the existing panel
      }

      // --- Otherwise, create a new webview panel ---
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

      // Load content from the React dev server for local development.
      const devServerUrl = "http://localhost:5173";
      panel.webview.html = getWebviewContent(devServerUrl);

      // Set our global reference
      infoPanel = panel;

      // Clean up the reference when the panel is closed by the user.
      panel.onDidDispose(
        () => {
          infoPanel = undefined;
        },
        null,
        context.subscriptions
      );

      // ✅ Return the NEWLY created panel
      return infoPanel;
    }
  );

  // Don't forget to push the disposable to the context subscriptions
  context.subscriptions.push(showInfoPanelDisposable);

  const learnMoreDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.learnMore",
    async (featureId: string) => {
      // 1. Ensure the panel is visible, creating it if necessary.
      //    This will return the panel instance.
      const panel = await vscode.commands.executeCommand<vscode.WebviewPanel>(
        "baseline-compat-assistant.showInfoPanel"
      );

      console.log(`Sending featureId to panel: ${featureId}`);

      // 2. Post a message to the webview with the feature to search for.
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

/**
 * Triggers a debounced and locked parse of the document. This prevents
 * multiple parses from running at once or too frequently.
 * @param document The VS Code text document to parse.
 */
function triggerParse(document: vscode.TextDocument) {
  // Clear any existing timer to reset the debounce period.
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set a new timer to run the parser after a short delay.
  debounceTimer = setTimeout(() => {
    // If a parse is already in progress, skip this trigger.
    if (isParsing) {
      console.log("Parser is busy, skipping this run.");
      return;
    }
    // Call the actual async parseFile function.
    parseFile(document);
  }, 300); // 300ms delay.
}

/**
 * Main parser function. Sets a lock, clears previous results, and triggers
 * the appropriate parser based on file type.
 * @param document The VS Code text document to parse.
 */
async function parseFile(document: vscode.TextDocument) {
  // 1. Set the lock to prevent other parse triggers from running.
  isParsing = true;

  try {
    // Clear previous data for a fresh parse.
    classRanges.length = 0;
    tagNames.length = 0;
    attributes.length = 0;
    eventHandlers.length = 0;
    styledComponents.length = 0;
    inlineComponents.length = 0;
    diagnosticsCollection.delete(document.uri);

    // Only parse supported file types.
    if (
      document.fileName.endsWith(".jsx") ||
      document.fileName.endsWith(".tsx")
    ) {
      await babelParser(document);
    }

    // Log parsed data for debugging.
    console.log(`Parsing complete for: ${path.basename(document.fileName)}`);
    console.log("Tags:", tagNames);
    console.log("Classes:", classRanges);
    console.log("Attributes:", attributes);
    console.log("Event Handlers:", eventHandlers);
    console.log("Styled Components:", styledComponents);
    console.log("Inline Components:", inlineComponents);
  } catch (error) {
    console.error("An error occurred during parsing:", error);
    vscode.window.showErrorMessage(
      "Baseline Assistant: An error occurred while parsing the file."
    );
  } finally {
    // 2. Release the lock, allowing the next parse to run.
    isParsing = false;
  }
}

/**
 * Generates the HTML content for the webview panel, embedding an iframe.
 * @param url The URL to load in the iframe.
 */
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

/**
 * Deactivation function for the extension.
 * Called when the extension is deactivated.
 */
export function deactivate() {}
