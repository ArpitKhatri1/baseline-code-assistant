"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emojizer = void 0;
exports.activate = activate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    const disposable = vscode.commands.registerCommand('baseline-compat-assistant.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from baseline-comspat-assistant!');
    });
    context.subscriptions.push(disposable);
}
class Emojizer {
    provideCodeActions(document, range, context, token) {
        if (!this.isStartofSmiley(document, range)) {
            return [];
        }
        const fix = this.createFix(document, range);
        return [fix];
    }
    isStartofSmiley(document, range) {
        const start = range.start;
        const line = document.lineAt(start.line);
        return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
    }
    createFix(document, range) {
        const fix = new vscode.CodeAction('Convert to emoji', vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, new vscode.Range(range.start, range.start.translate(0, 2)), ':9');
        return fix;
    }
}
exports.Emojizer = Emojizer;
//# sourceMappingURL=extension.js.map