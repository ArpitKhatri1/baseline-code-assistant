// src/lib/DiagnosticsTreeDataProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';

export type DiagnosticIssue = {
  uri: vscode.Uri;
  diagnostic: vscode.Diagnostic;
};

export class DiagnosticsTreeDataProvider implements vscode.TreeDataProvider<DiagnosticIssue> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiagnosticIssue | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<DiagnosticIssue | undefined | null | void> = this._onDidChangeTreeData.event;

  private issues: DiagnosticIssue[] = [];

  public refresh(issues: DiagnosticIssue[]): void {
    this.issues = issues;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DiagnosticIssue): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.diagnostic.message, vscode.TreeItemCollapsibleState.None);
    treeItem.description = `${path.basename(element.uri.fsPath)}:${element.diagnostic.range.start.line + 1}`;
    treeItem.tooltip = `${element.diagnostic.message}\n${element.uri.fsPath}`;
    
    treeItem.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [
        element.uri,
        {
          selection: element.diagnostic.range,
        },
      ],
    };

    return treeItem;
  }

  getChildren(element?: DiagnosticIssue): Thenable<DiagnosticIssue[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.issues);
    }
  }
}