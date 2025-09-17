
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('baseline-compat-assistant.helloWorld', () => {
		
		vscode.window.showInformationMessage('Hello World from baseline-comspat-assistant!');
	});

	context.subscriptions.push(disposable);
}


export function deactivate() {}
