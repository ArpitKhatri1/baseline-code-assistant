import * as vscode from 'vscode';
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { attributes, classRanges, eventHandlers, styledComponents, tagNames } from '../extension';
import { checkBaseLineProperties } from '../lib/baseline';


export async function babelParser(document: vscode.TextDocument) {
  const outputChannel = vscode.window.createOutputChannel("ast output");
  const code = document.getText();
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
    ranges: true,
    errorRecovery: true,
  });
  outputChannel.show(true);
  outputChannel.appendLine(JSON.stringify(ast,null,4));

  traverse(ast, {
    JSXOpeningElement(path) {
      handleJSXElement(path, document);
    },
    JSXAttribute(path) {
      handleJSXAttribute(path, document);
    },
    TaggedTemplateExpression(path) {
     handleStyledComponent(path,document);
    },
  });

  await checkBaseLineProperties();
}


function handleJSXElement(
  path: NodePath<t.JSXOpeningElement>,
  document: vscode.TextDocument
) {
  if (!t.isJSXIdentifier(path.node.name)) {return;}
  const node = path.node.name;
  if (node.range) {
    tagNames.push({ tag: node.name, start: node.range[0], end: node.range[1] ,document:document});
  }
}

function handleClassNames(
  valueNode: t.StringLiteral | t.JSXExpressionContainer,
  document: vscode.TextDocument
) {
  if (t.isStringLiteral(valueNode)) {
    collectStaticClasses(valueNode.value, valueNode.range ?? [0, 0], document);
    return;
  }
  if (t.isJSXExpressionContainer(valueNode)) {
    const expr = valueNode.expression;
    if (t.isJSXEmptyExpression(expr)) {return;}
    if (t.isExpression(expr)) {
      extractFromExpression(expr, document);
    }
  }
}

function extractFromExpression(
  expr: t.Expression,
  document: vscode.TextDocument
) {
  if (t.isTemplateLiteral(expr)) {
    expr.quasis.forEach((q) =>
      collectStaticClasses(q.value.cooked || "", q.range ?? [0, 0], document)
    );
  } else if (t.isBinaryExpression(expr, { operator: "+" })) {
    if (t.isStringLiteral(expr.left)) {
      collectStaticClasses(
        expr.left.value,
        expr.left.range ?? [0, 0],
        document
      );
    }

    extractFromExpression(expr.right, document);
  }
}

function collectStaticClasses(
  raw: string,
  range: [number, number],
  document: vscode.TextDocument
) {
  const [startBase] = range;
  const offset = startBase + 1;
  raw.split(/\s+/).forEach((cls) => {
    if (!cls.trim()) {return;}
    const idx = raw.indexOf(cls);
    if (idx !== -1) {
      classRanges.push({
        className: cls,
        start: offset + idx,
        end: offset + idx + cls.length,
        document:document
      });
    }
  });
}


function handleJSXAttribute(
  path: NodePath<t.JSXAttribute>,
  document: vscode.TextDocument
) {
  const name = t.isJSXIdentifier(path.node.name)
    ? path.node.name.name
    : undefined;
  if (!name) {return;}

  if (path.node.name.range) {
    attributes.push({
      prop: name,
      start: path.node.name.range[0],
      end: path.node.name.range[1],
      document:document
    });
  }


  if (/^on[A-Z]/.test(name) && path.node.name.range) {
    eventHandlers.push({
      event: name,
      start: path.node.name.range[0],
      end: path.node.name.range[1],
      document:document
    });
  }

  // className
  const valueNode = path.node.value;
  if (name === "className" && valueNode)
    {handleClassNames(valueNode as any, document);}
}


function isStyledExpression(node: t.Node): boolean {
  if (t.isIdentifier(node, { name: "styled" })) return true;

  if (t.isMemberExpression(node)) {
    // styled.div or styled.div.attrs
    return isStyledExpression(node.object);
  }

  if (t.isCallExpression(node)) {
    // styled("div") or styled(Component)
    return isStyledExpression(node.callee);
  }

  return false;
}

// Main handler for a TaggedTemplateExpression
function handleStyledComponent(path: NodePath<t.TaggedTemplateExpression>, document: any) {
  const tag = path.node.tag;

  if (isStyledExpression(tag)) {
    const quasi = path.node.quasi;
    let cssText = quasi.quasis.map((q) => q.value.raw).join("\n");
     cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, ''); // removes the comment
     cssText = cssText.replace(/\n/g,' ');

    styledComponents.push({
      css: cssText,
      start: path.node.start ?? 0,
      end: path.node.end ?? 0,
      document,
    });
  }
}

