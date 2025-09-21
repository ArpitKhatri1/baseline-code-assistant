
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('baseline-compat-assistant.helloWorld', () => {
		
		vscode.window.showInformationMessage('Hello World from baseline-comspat-assistant!');
	});

	context.subscriptions.push(disposable);


	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('plaintext', new Emojizer(), {
			providedCodeActionKinds: Emojizer.providedCodeActionKinds
		})
	) 

}

export class Emojizer implements vscode.CodeActionProvider{
	
	  public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken):  vscode.CodeAction[] {

		if(!this.isStartofSmiley(document,range)){
			return [];
		}

		const fix = this.createFix(document,range);

		return [fix];
	}

	private isStartofSmiley(document:vscode.TextDocument, range: vscode.Range): boolean {
		const start = range.start;
		const line = document.lineAt(start.line);
		return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
	}
	private createFix(document:vscode.TextDocument, range:vscode.Range): vscode.CodeAction {
		const fix = new vscode.CodeAction('Convert to emoji',vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();
		fix.edit.replace(document.uri,new vscode.Range(range.start,range.start.translate(0,2)),':9');
		return fix;
}
}
