import * as vscode from "vscode";
export interface ClassRangeType {
  className: string;
  start: number;
  end: number;
  document: vscode.TextDocument;
}
export interface TagNameRangeType {
  tag: string;
  start: number;
  end: number;
  document: vscode.TextDocument;
}
export interface AttributePropType {
  prop: string;
  start: number;
  end: number;
  document: vscode.TextDocument;
}
export interface EventHandlerPropType {
  event: string;
  start: number;
  end: number;
  document: vscode.TextDocument;
}
interface BaselineSupport {
  chrome: string;
  chrome_android: string;
  edge: string;
  firefox: string;
  firefox_android: string;
  safari: string;
  safari_ios: string;
}

export interface BaselineStatus {
  baseline: "high" | "low" | string | boolean;
  baseline_low_date: string;
  baseline_high_date: string;
  support: BaselineSupport;
}
