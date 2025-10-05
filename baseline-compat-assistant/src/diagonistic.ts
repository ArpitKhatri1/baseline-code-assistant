import * as vscode from "vscode";
import { diagnosticsCollection } from "./extension";
import { BaselineStatus } from "./types/types";
import { userBrowserConfig } from "./config/config";
import * as path from "path";
import { log } from "console";


export async function checkBaselineUserRequirements(
  baselineResponse: BaselineStatus,
  document: vscode.TextDocument,
  start: number,
  end: number,
  propertyName: string
) {
  if (baselineResponse.baseline !== "high" ) {
    console.log(propertyName);
    addDiagnosticRange(
      document,
      start,
      end,
      `${propertyName} has a baseline ${baselineResponse.baseline} status, Are you sure you want to use it.`
    );
  }
  for (const browser of Object.keys(userBrowserConfig)) {
    const required = userBrowserConfig[browser]; // minimum this version is required
    // console.log(baselineResponse.support);
    const supported = baselineResponse.support[browser] ?? "0"; // it is supported from this version

    if (parseInt(supported) > parseInt(required)) {
      addDiagnosticRange(
        document,
        start,
        end,
        `${propertyName} requires ${browser} >= ${required}, but baseline shows ${supported}. Are you sure you want to use it?`
      );
    
    }
  }
}

export async function addDiagnosticRange(
  document: vscode.TextDocument,
  start: number,
  end: number,
  message = "old",
 
) {
  // Auto-detect origin if not provided
    let origin;
    const ext = path.extname(document.uri.fsPath).toLowerCase();
    if (ext === ".html" || ext === ".htm") origin = "ES_HTML";
    else if (ext === ".css") origin = "ES_CSS";
    else if(ext === ".js") origin = "ES_JS"; // default
    else origin = "";
  

  console.log(origin);

  const range = new vscode.Range(
    document.positionAt(start),
    document.positionAt(end)
  );
  const diag = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Warning
  );

  console.log(`[Diagnostic Message]: ${message}`);
  const semiParsedArgs = message.split(" ")[0];
  console.log("Intermediate:", semiParsedArgs);

  let args: any;
  let length = -1;

  // Handle argument parsing differently based on file type
  if (origin === "ES_HTML" || origin === "ES_CSS") {
    // Extract content inside quotes (handles both ' and ")
    const match = message.match(/["']([^"']+)["']/);
    args = match ? match[1] : message;
  } else if (origin === "ES_JS") {
    args = semiParsedArgs;
  } else {
    if (semiParsedArgs.includes(".")) {
      args = semiParsedArgs.split(".");
      length = args.length;
    } else {
      args = semiParsedArgs;
    }
  }

  const argsLength = Array.isArray(args) ? args.length : 0;

  diag.code = {
    value: "Learn More",
    target: vscode.Uri.parse(
      `command:baseline-compat-assistant.learnMore?${encodeURIComponent(
        JSON.stringify(length !== -1 ? args[argsLength - 1] : args)
      )}`
    ),
  };

  const existing = diagnosticsCollection.get(document.uri) || [];
  diagnosticsCollection.set(document.uri, [...existing, diag]);
}