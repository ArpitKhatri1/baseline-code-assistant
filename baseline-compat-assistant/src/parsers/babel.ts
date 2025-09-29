import * as vscode from 'vscode'
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { attributes, classRanges, eventHandlers, styledComponents, tagNames } from '../extension';
import { checkBaseLineProperties } from '../lib/baseline';


export async function babelParser(document: vscode.TextDocument) {
  const code = document.getText();
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
    ranges: true,
    errorRecovery: true,
  });

  traverse(ast, {
    JSXOpeningElement(path) {
      handleJSXElement(path, document);
    },
    JSXAttribute(path) {
      handleJSXAttribute(path, document);
    },
    TaggedTemplateExpression(path) {
      handleStyledComponent(path);
    },
  });

  await checkBaseLineProperties();
}


function handleJSXElement(
  path: NodePath<t.JSXOpeningElement>,
  document: vscode.TextDocument
) {
  if (!t.isJSXIdentifier(path.node.name)) return;
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
    if (t.isJSXEmptyExpression(expr)) return;
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
    if (!cls.trim()) return;
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
  if (!name) return;

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
    handleClassNames(valueNode as any, document);
}


function handleStyledComponent(path: NodePath<t.TaggedTemplateExpression>) {
  const tag = path.node.tag;
  if (
    (t.isMemberExpression(tag) &&
      t.isIdentifier(tag.object, { name: "styled" })) ||
    (t.isCallExpression(tag) && t.isIdentifier(tag.callee, { name: "styled" }))
  ) {
    styledComponents.push(path.get("tag").toString());
  }
}
