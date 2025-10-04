import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs/promises';
import { userBrowserConfig } from '../config/config';

// Mapping from official browserslist names to your custom key names
const BROWSER_NAME_MAP: Record<string, string> = {
  'and_chr': 'chrome_android',
  'and_ff': 'firefox_android',
  'ios_saf': 'safari_ios'
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
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#') || trimmedLine === '') {
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

    console.log("Updated browser config from .browserslistrc:", userBrowserConfig);

  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      console.log(".browserslistrc not found. Using default config.");
    } else {
      console.error("Error reading .browserslistrc:", error);
    }
  }
}