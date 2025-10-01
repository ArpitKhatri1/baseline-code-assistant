import * as vscode from "vscode";
import { diagnosticsCollection } from "./extension";
import { BaselineStatus } from "./types/types";
import { userBrowserConfig } from "./config/config";

export async function checkBaselineUserRequirements(
  baselineResponse: BaselineStatus,
  document: vscode.TextDocument,
  start: number,
  end: number,
  propertyName: string
) {
  if (baselineResponse.baseline === "low") {
    console.log(propertyName);
    addDiagnosticRange(
      document,
      start,
      end,
      `${propertyName} has a baseline LOW status, Are you sure you want to use it.`
    );
  }
  for (const browser of Object.keys(userBrowserConfig)) {
    
    const required = userBrowserConfig[browser];
    // console.log(baselineResponse.support);
    const supported = baselineResponse.support[browser] ?? "0";
    // if (parseInt(supported) < parseInt(required)) {
    //   addDiagnosticRange(
    //     document,
    //     start,
    //     end,
    //     `${propertyName} requires ${browser} >= ${required}, but baseline shows ${supported}. Are you sure you want to use it?`
    //   );
    //   break;
    // }
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

  const args = "twitter";
  diag.code = {
    value: "Learn More",
    target: vscode.Uri.parse(
      `command:baseline-compat-assistant.learnMore?${encodeURIComponent(
        JSON.stringify(args)
      )}`
    ),
  };
  const existing = diagnosticsCollection.get(document.uri) || [];
  diagnosticsCollection.set(document.uri, [...existing, diag]);
}
