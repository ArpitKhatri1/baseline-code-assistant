import * as vscode from 'vscode';
import { diagnosticsCollection } from './extension';
type FeatureData = import("../node_modules/web-features/types.quicktype").FeatureData;

export async function checkBaselineUserRequirements(baselineResponse:FeatureData,document:vscode.TextDocument,start:number,end:number,message:string){
    console.log(baselineResponse.compat_features,baselineResponse);
    if(baselineResponse.status?.baseline === "high" || baselineResponse.status?.baseline === "low"){
        addDiagnosticRange(document,start,end,message);
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
  const diag = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
  const existing = diagnosticsCollection.get(document.uri) || [];
  diagnosticsCollection.set(document.uri, [...existing, diag]);
}