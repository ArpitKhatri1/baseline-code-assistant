// src/lib/DiagnosticsTreeDataProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';

// A simple data structure to hold a diagnostic and its file URI
export type DiagnosticIssue = {
  uri: vscode.Uri;
  diagnostic: vscode.Diagnostic;
};

export class DiagnosticsTreeDataProvider implements vscode.TreeDataProvider<DiagnosticIssue> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiagnosticIssue | undefined | null | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<DiagnosticIssue | undefined | null | void> = this._onDidChangeTreeData.event;

  private issues: DiagnosticIssue[] = [];

  // This method will be called by your command to update the list of issues
  public refresh(issues: DiagnosticIssue[]): void {
    this.issues = issues;
    this._onDidChangeTreeData.fire();
  }

  // Tells VS Code how to display each item in the tree
  getTreeItem(element: DiagnosticIssue): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.diagnostic.message, vscode.TreeItemCollapsibleState.None);
    treeItem.description = `${path.basename(element.uri.fsPath)}:${element.diagnostic.range.start.line + 1}`;
    treeItem.tooltip = `${element.diagnostic.message}\n${element.uri.fsPath}`;
    
    // This command will be executed when the user clicks the item
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

  // Tells VS Code what to display at the root of the tree
  getChildren(element?: DiagnosticIssue): Thenable<DiagnosticIssue[]> {
    if (element) {
      // Our items don't have children, so we return an empty array
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.issues);
    }
  }
}