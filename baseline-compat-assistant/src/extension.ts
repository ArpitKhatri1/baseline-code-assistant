import * as vscode from "vscode";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { convertFromCssToJss, getConvertedClasses } from "./lib/tailwind-to-css";

function jsToCssProp(prop: string) {
  return prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

async function checkBaselineFeature(featureKey: string) {
  const { features } = await import("web-features");
  return features[featureKey] || null;
}

const parseReactFiles = async (document: vscode.TextDocument) => {
  if (
    !document.fileName.endsWith(".jsx") &&
    !document.fileName.endsWith(".tsx")
  )
    return;

  const code = document.getText();
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
  });

  const classes: string[] = [];
  const styledComponents: string[] = [];
  const styleProps: string[] = [];

  traverse(ast, {
    JSXAttribute(path) {
      const name = path.node.name.name;
      const valueNode = path.node.value;

      if (name === "className" && valueNode?.type === "StringLiteral") {
        classes.push(valueNode.value);
      }

      if (name === "style" && valueNode?.type === "JSXExpressionContainer") {
        const expr = valueNode.expression;
        if (expr.type === "ObjectExpression") {
          expr.properties.forEach((prop: any) => {
            let keyName = "";
            if (t.isIdentifier(prop.key)) keyName = prop.key.name;
            else if (t.isStringLiteral(prop.key)) keyName = prop.key.value;
            if (keyName) styleProps.push(keyName);
          });
        }
      }
    },
    TaggedTemplateExpression(path) {
      const tag = path.node.tag;
      if (
        (tag.type === "MemberExpression" &&
          tag.object.type === "Identifier" &&
          tag.object.name === "styled") ||
        (tag.type === "CallExpression" &&
          tag.callee.type === "Identifier" &&
          tag.callee.name === "styled")
      ) {
        styledComponents.push(path.get("tag").toString());
      }
    },
  });

  for (const key of styleProps) {
    const cssProp = jsToCssProp(key).toLowerCase();
    console.log(cssProp);
    try {
      const result = await checkBaselineFeature(cssProp);
      if (!result) console.log(`No baseline data for: ${cssProp}`);
      else console.log(`${cssProp}:`, result);
    } catch (err) {
      console.error(`Error checking baseline for ${cssProp}:`, err);
    }
  }

  console.log("File:", document.fileName);
  const classcss = classes[0];
  console.log(classcss);
  console.log("CSS Classes:",convertFromCssToJss(getConvertedClasses(classcss)));
  console.log("Styled Components:", styledComponents);
};

export function activate(context: vscode.ExtensionContext) {
  vscode.workspace.onDidSaveTextDocument((document) =>
    parseReactFiles(document)
  );
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) parseReactFiles(editor.document);
  });
  if (vscode.window.activeTextEditor) {
    parseReactFiles(vscode.window.activeTextEditor.document);
  }
}
