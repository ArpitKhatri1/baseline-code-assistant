import * as vscode from "vscode";
import { diagnosticsCollection } from "./extension";
import { BaselineStatus } from "./types/types";

export async function checkBaselineUserRequirements(
  baselineResponse: BaselineStatus,
  document: vscode.TextDocument,
  start: number,
  end: number,
  message: string
) {
  console.log(baselineResponse);

  if (baselineResponse.baseline === "low") {
    addDiagnosticRange(document, start, end, message);
  }
}

export async function addDiagnosticRange(
  document: vscode.TextDocument,
  start: number,
  end: number,
  message = "old"
) {
  const range = new vscode.Range(
    document.positionAt(start),
    document.positionAt(end)
  );
  const diag = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Warning
  );
  const existing = diagnosticsCollection.get(document.uri) || [];
  diagnosticsCollection.set(document.uri, [...existing, diag]);
}
