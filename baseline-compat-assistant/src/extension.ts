import * as vscode from "vscode";
import * as path from "path";
import { babelParser } from "./parsers/babel";
import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
  rawCSSType,
} from "./types/types";

// --- Globals ---

// A reference to our webview panel to avoid creating duplicates
let infoPanel: vscode.WebviewPanel | undefined = undefined;

// Collection to store diagnostics (warnings, errors)
export let diagnosticsCollection: vscode.DiagnosticCollection;

// Arrays to store parsed data from files
export const classRanges: ClassRangeType[] = [];
export const tagNames: TagNameRangeType[] = [];
export const attributes: AttributePropType[] = [];
export const eventHandlers: EventHandlerPropType[] = [];
export const styledComponents: rawCSSType[] = [];


/**
 * Main parser function. Clears previous results and triggers
 * the appropriate parser based on file type.
 * @param document The VS Code text document to parse.
 */
export async function parseFile(document: vscode.TextDocument) {
  // Clear previous data before parsing
  classRanges.length = 0;
  tagNames.length = 0;
  attributes.length = 0;
  eventHandlers.length = 0;
  styledComponents.length = 0;
  diagnosticsCollection.delete(document.uri);

  // Currently supports Babel parser for JSX/TSX files
  if (
    document.fileName.endsWith(".jsx") ||
    document.fileName.endsWith(".tsx")
  ) {
    babelParser(document);
  }

  // Logging parsed data for debugging purposes
  console.log("Tags:", tagNames);
  console.log("Classes:", classRanges);
  console.log("Attributes:", attributes);
  console.log("Event Handlers:", eventHandlers);
  console.log("Styled Components:", styledComponents);
}


/**
 * The main activation function for the extension.
 * This is called once when the extension is activated.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  // Setup diagnostics collection
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "Unsupported Features"
  );
  context.subscriptions.push(diagnosticsCollection);

  // --- Parser Triggers ---
  // Run the parser when a file is saved
  vscode.workspace.onDidSaveTextDocument(parseFile);

  // Run the parser when the active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      parseFile(editor.document);
    }
  });

  // Run the parser on the initially active file when VS Code starts
  if (vscode.window.activeTextEditor) {
    parseFile(vscode.window.activeTextEditor.document);
  }

  // --- Command Registration ---

  // Command to show the webview panel
  const showInfoPanelDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.showInfoPanel",
    () => {
      // If the panel already exists, just reveal it
      if (infoPanel) {
        infoPanel.reveal(vscode.ViewColumn.Beside);
        return;
      }

      // Otherwise, create a new webview panel
      const panel = vscode.window.createWebviewPanel(
        "infoPanel",
        "Web Baseline Status",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          // Restrict the webview to only loading content from our extension's dist directory.
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "react-sidepanel", "dist")),
          ],
        }
      );

      // For local development, load content from the React dev server
      const devServerUrl = "http://localhost:5173";
      panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
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
          </head>
          <body>
            <iframe src="${devServerUrl}"></iframe>
          </body>
        </html>`;

      // Keep a reference to the panel
      infoPanel = panel;

      // Clean up the reference when the panel is closed by the user
      panel.onDidDispose(
        () => {
          infoPanel = undefined;
        },
        null,
        context.subscriptions
      );
    }
  );
  context.subscriptions.push(showInfoPanelDisposable);

  // Command that is triggered by the "Learn More" link in a diagnostic message
  const learnMoreDisposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.learnMore",
    (featureId: string) => {
      // First, ensure the panel is visible. This will create it if it doesn't exist.
      vscode.commands.executeCommand("baseline-compat-assistant.showInfoPanel");

      // Post a message to the webview with the feature to search for.
      // A small delay ensures the panel has time to be created if it wasn't already open.
      setTimeout(() => {
        if (infoPanel) {
          infoPanel.webview.postMessage({
            command: 'updateQuery',
            query: featureId
          });
        }
      }, 200);
    }
  );
  context.subscriptions.push(learnMoreDisposable);
}

/**
 * Deactivation function for the extension.
 * Called when the extension is deactivated.
 */
export function deactivate() {}

