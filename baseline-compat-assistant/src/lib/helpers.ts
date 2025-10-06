import * as vscode from "vscode";
import path from "path";
import fs from "fs/promises";
import { userBrowserConfig } from "../config/config";
import { addDiagnosticRange } from "../diagonistic";
import { ESLint } from "eslint";
import { DiagnosticIssue } from "./DiagonsticTreeProvider";

const BROWSER_NAME_MAP: Record<string, string> = {
  and_chr: "chrome_android",
  and_ff: "firefox_android",
  ios_saf: "safari_ios",
};

export async function syncBrowserConfig() {
  if (!vscode.workspace.workspaceFolders) {
    console.log("No workspace folder open to find .browserslistrc.");
    return;
  }

  const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const configPath = path.join(workspaceRoot, ".browserslistrc");

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#") || trimmedLine === "") {
        continue;
      }

      const parts = trimmedLine.split(/ >=? /);
      if (parts.length === 2) {
        const officialName = parts[0].trim();
        const browserVersion = parts[1].trim();

        const userConfigKey = BROWSER_NAME_MAP[officialName] || officialName;

        if (userConfigKey in userBrowserConfig) {
          userBrowserConfig[userConfigKey] = browserVersion;
        }
      }
    }

    console.log(
      "Updated browser config from .browserslistrc:",
      userBrowserConfig
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.log(".browserslistrc not found. Using default config.");
    } else {
      console.error("Error reading .browserslistrc:", error);
    }
  }
}

export async function runEslintOnHtml(
  fileUri: vscode.Uri
): Promise<DiagnosticIssue[]> {
  const allIssues: DiagnosticIssue[] = [];
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) return [];

    const projectRootPath = workspaceFolder.uri.fsPath;
    const configFileName = "baseline-compat.config.mjs";
    const configFilePath = path.join(projectRootPath, configFileName);
    const configFileUri = vscode.Uri.file(configFilePath);

    const eslintOptions: ESLint.Options = {
      cwd: projectRootPath,
    };

    try {
      await vscode.workspace.fs.stat(configFileUri);
      eslintOptions.overrideConfigFile = configFilePath;
      console.log(`Using custom ESLint config: ${configFilePath}`);
    } catch {
      console.log(
        `Custom ESLint config not found at ${configFilePath}. Linting with default rules if any.`
      );
    }

    const eslint = new ESLint(eslintOptions);
    const results = await eslint.lintFiles([fileUri.fsPath]);

    for (const result of results) {
      if (result.filePath !== fileUri.fsPath) continue;

      for (const message of result.messages) {
        const startLine = message.line - 1;
        const startChar = message.column - 1;
        const endLine = message.endLine ? message.endLine - 1 : startLine;
        const endChar = message.endColumn
          ? message.endColumn - 1
          : startChar + 1;

        const range = new vscode.Range(startLine, startChar, endLine, endChar);

        const diagnostic = new vscode.Diagnostic(
          range,
          message.message,
          vscode.DiagnosticSeverity.Warning
        );

        const document = await vscode.workspace.openTextDocument(fileUri);

        const startPos = document.offsetAt(
          new vscode.Position(message.line - 1, message.column - 1)
        );

        const endPos = document.offsetAt(new vscode.Position(endLine, endChar));

        await addDiagnosticRange(document, startPos, endPos, message.message);
        allIssues.push({ uri: fileUri, diagnostic });
      }
    }
  } catch (error) {
    console.error(
      `An error occurred in runEslintOnHtml for ${fileUri.fsPath}:`,
      error
    );
  }
  return allIssues;
}
