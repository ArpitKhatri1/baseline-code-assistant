import fs from "fs";
import * as vscode from "vscode";

import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
  rawCSSType
} from "./types/types";
import { babelParser } from "./parsers/babel";
import path from "path";

// Globals
export let diagnosticsCollection: vscode.DiagnosticCollection;

export const classRanges: ClassRangeType[] = [];
export const tagNames: TagNameRangeType[] = [];
export const attributes: AttributePropType[] = [];
export const eventHandlers: EventHandlerPropType[] = [];
export const styledComponents: rawCSSType[] = [];

// main parser function
export async function parseFile(document: vscode.TextDocument) {
  classRanges.length = 0;
  tagNames.length = 0;
  attributes.length = 0;
  eventHandlers.length = 0;
  styledComponents.length = 0;
  diagnosticsCollection.delete(document.uri);

  if (
    document.fileName.endsWith(".jsx") ||
    document.fileName.endsWith(".tsx")
  ) {
    babelParser(document);
  }

  console.log("Tags:", tagNames);
  console.log("Classes:", classRanges);
  console.log("Attributes:", attributes);
  console.log("Event Handlers:", eventHandlers);
  console.log("Styled Components:", styledComponents);
}

export function activate(context: vscode.ExtensionContext) {
  //setup diagnosticsCollections
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "Unsupported Features"
  );
  context.subscriptions.push(diagnosticsCollection);

  //run parser on save
  vscode.workspace.onDidSaveTextDocument(parseFile);

  //run parser on file change
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      parseFile(editor.document);
    }
  });

  // run parser on initial load
  if (vscode.window.activeTextEditor) {
    parseFile(vscode.window.activeTextEditor.document);
  }



  const disposable = vscode.commands.registerCommand(
    "baseline-compat-assistant.showInfoPanel",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "infoPanel",
        "Extra Information",
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
     panel.webview.html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        html, body {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden; /* prevent extra scroll */
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <iframe src="${devServerUrl}"></iframe>
    </body>
  </html>
`;
      // // Read index.html from React build
      // const indexPath = path.join(
      //   context.extensionPath,
      //   "react-sidepanel",
      //   "dist",
      //   "index.html"
      // );
      // console.log("hi");
      // console.log(indexPath);
      // let html = fs.readFileSync(indexPath, "utf8");

      // // Replace JS/CSS asset paths so VSCode can load them
      // html = html.replace(
      //   /"\/assets\/([^"]+)"/g,
      //   (match, p1) =>
      //     `"${panel.webview.asWebviewUri(
      //       vscode.Uri.file(
      //         path.join(
      //           context.extensionPath,
      //           "react-sidepanel",
      //           "dist",
      //           "assets",
      //           p1
      //         )
      //       )
      //     )}"`
      // );

      // panel.webview.html = html;
    }
  );

  context.subscriptions.push(disposable);
}
