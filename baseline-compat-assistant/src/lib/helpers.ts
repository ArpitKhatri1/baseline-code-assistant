import * as vscode from "vscode";
import path from "path";
import fs from "fs/promises";
import { userBrowserConfig } from "../config/config";
import { addDiagnosticRange } from "../diagonistic";
import { ESLint } from "eslint";
import { DiagnosticIssue } from "./DiagonsticTreeProvider";

// Mapping from official browserslist names to your custom key names
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

        // Use the map to get your custom key, or fall back to the official name
        const userConfigKey = BROWSER_NAME_MAP[officialName] || officialName;

        // IMPORTANT: Check if the final key exists in your config object
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

    // Options for the ESLint constructor
    const eslintOptions: ESLint.Options = {
      cwd: projectRootPath,
      // By default, ESLint looks for eslint.config.js. We don't want that.
    };

    try {
      // Check if our custom config file exists
      await vscode.workspace.fs.stat(configFileUri);
      // If it exists, tell ESLint to use it exclusively.
      eslintOptions.overrideConfigFile = configFilePath;
      console.log(`Using custom ESLint config: ${configFilePath}`);
    } catch {
      // The file doesn't exist. We can either stop or proceed with a default internal config.
      // For now, let's log that we're not using it.
      console.log(
        `Custom ESLint config not found at ${configFilePath}. Linting with default rules if any.`
      );
      // If you had a fallback config object, you could assign it here:
      // eslintOptions.overrideConfig = myFallbackConfig;
    }

    const eslint = new ESLint(eslintOptions);
    const results = await eslint.lintFiles([fileUri.fsPath]);

    for (const result of results) {
      if (result.filePath !== fileUri.fsPath) continue;

      for (const message of result.messages) {
        // ESLint locations are 1-based, VSCode locations are 0-based
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
