import * as vscode from "vscode";

import {
  AttributePropType,
  ClassRangeType,
  EventHandlerPropType,
  TagNameRangeType,
} from "./types/types";
import { babelParser } from "./parsers/babel";

// Globals
export let diagnosticsCollection: vscode.DiagnosticCollection;

export const classRanges: ClassRangeType[] = [];
export const tagNames: TagNameRangeType[] = [];
export const attributes: AttributePropType[] = [];
export const eventHandlers: EventHandlerPropType[] = [];
export const styledComponents: string[] = [];

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
    if (editor) parseFile(editor.document);
  });

  // run parser on initial load
  if (vscode.window.activeTextEditor) {
    parseFile(vscode.window.activeTextEditor.document);
  }
}
