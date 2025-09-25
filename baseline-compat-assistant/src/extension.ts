import * as vscode from "vscode";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { convertFromCssToJss, getConvertedClasses } from "./lib/tailwind-to-css";
import { Feature } from "./types/types";

let diagnosticsCollection: vscode.DiagnosticCollection ;

function jsToCssProp(prop: string) {
  return prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

async function checkBaselineFeature(featureKey: string) {
  const { features } = await import("web-features");
  return features[featureKey] || null;
}

const parseReactFiles = async (document: vscode.TextDocument) => {
  diagnosticsCollection.delete(document.uri);
 
  if (!document.fileName.endsWith(".jsx") && !document.fileName.endsWith(".tsx"))
    return;

  const code = document.getText();
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
    ranges: true,    
    errorRecovery: true,
  });

  interface ClassRange {
    className: string;
    start: number;
    end: number;
  }

  interface StylePropRange {
    prop: string;
    start: number;
    end: number;
  }

  const classRanges: ClassRange[] = [];
  const stylePropRanges: StylePropRange[] = [];
  const styledComponents: string[] = [];

  traverse(ast, {
    JSXAttribute(path: NodePath<t.JSXAttribute>) {
      const name = t.isJSXIdentifier(path.node.name)
        ? path.node.name.name
        : undefined;

      const valueNode = path.node.value;


      if (name === "className" && t.isStringLiteral(valueNode)) {
        const rawValue = valueNode.value;           
        const quoteOffset = valueNode.range?.[0] ?? 0;
        const stringStart = quoteOffset + 1;

        rawValue.split(/\s+/).forEach((cls) => {
          const idx = rawValue.indexOf(cls);
          if (idx !== -1) {
            classRanges.push({
              className: cls,
              start: stringStart + idx,
              end: stringStart + idx + cls.length,
            });
            addDiagonstic(document,stringStart+idx,stringStart+idx+cls.length);
          }
        });
      }


      if (name === "style" && t.isJSXExpressionContainer(valueNode)) {
        const expr = valueNode.expression;
        if (t.isObjectExpression(expr)) {
          expr.properties.forEach((prop) => {
            if (!t.isObjectProperty(prop)) return;
            let keyName = "";
            if (t.isIdentifier(prop.key)) keyName = prop.key.name;
            else if (t.isStringLiteral(prop.key)) keyName = prop.key.value;

            if (keyName && prop.key.range) {
              stylePropRanges.push({
                prop: keyName,
                start: prop.key.range[0],
                end: prop.key.range[1],
              });
            }
          });
        }
      }
    },

    TaggedTemplateExpression(path) {
      const tag = path.node.tag;
      if (
        (t.isMemberExpression(tag) &&
          t.isIdentifier(tag.object, { name: "styled" })) ||
        (t.isCallExpression(tag) && t.isIdentifier(tag.callee, { name: "styled" }))
      ) {
        styledComponents.push(path.get("tag").toString());
      }
    },
  });

  // Baseline check for style props
  for (const { prop } of stylePropRanges) {
    const cssProp = jsToCssProp(prop).toLowerCase();
    try {
      const result = await checkBaselineFeature(cssProp);
      if (!result) console.log(`No baseline data for: ${cssProp}`);
      else console.log(`${cssProp}:`, result);
    } catch (err) {
      console.error(`Error checking baseline for ${cssProp}:`, err);
    }
  }

  console.log("File:", document.fileName);
  console.log("Individual class ranges:", classRanges);
  console.log("Individual style prop ranges:", stylePropRanges);
  console.log("Styled Components:", styledComponents);
};

function addDiagonstic(document:vscode.TextDocument,start:number,end:number){
  const range = new vscode.Range(document.positionAt(start),document.positionAt(end));
  const diagonstics = new vscode.Diagnostic(
    range,"old",vscode.DiagnosticSeverity.Warning
  );
 
  const existing = diagnosticsCollection.get(document.uri) || [];


  diagnosticsCollection.set(document.uri, [...existing, diagonstics]);
}

export function activate(context: vscode.ExtensionContext) {

   diagnosticsCollection = vscode.languages.createDiagnosticCollection("Unsupported Features");
  context.subscriptions.push(diagnosticsCollection);


  vscode.workspace.onDidSaveTextDocument(parseReactFiles);
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) parseReactFiles(editor.document);
  });
  if (vscode.window.activeTextEditor) {
    parseReactFiles(vscode.window.activeTextEditor.document);
  }
}
