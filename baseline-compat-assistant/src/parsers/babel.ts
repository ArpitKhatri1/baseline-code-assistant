import { safeParser } from "postcss-safe-parser";
import * as vscode from "vscode";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import {
  attributes,
  classRanges,
  eventHandlers,
  styledComponents,
  tagNames,
  inlineComponents,
} from "../extension";
import { checkBaseLineProperties } from "../lib/baseline";
import postcss from "postcss";

export interface ParsedDeclaration {
  property: string;
  value: string;
  start: number;
  end: number;
  document: any;
}

export interface ParsedSelector {
  selector: string;
  start: number;
  end: number;
  document: any;
}

export const parsedDeclarations: ParsedDeclaration[] = [];
export const parsedSelectors: ParsedSelector[] = [];
export async function babelParser(document: vscode.TextDocument) {
  // ... (setup code is the same)
  const code = document.getText();
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties"],
    ranges: true,
    errorRecovery: true,
  });

  // 👇 1. Create an array to hold all the promises
  const promises: Promise<void>[] = [];

  traverse(ast, {
    JSXOpeningElement(path) {
      handleJSXElement(path, document);
    },
    JSXAttribute(path) {
      handleJSXAttribute(path, document);
    },
    TaggedTemplateExpression(path) {
      // 👇 2. Push the promise from the async handler into the array
      promises.push(handleStyledComponent(path, document));
    },
  });

  // 👇 3. Wait for all the collected promises to finish
  await Promise.all(promises);

  // ✅ Now the arrays will be correctly populated
  console.log("Declarations Found:", parsedDeclarations);
  console.log("Selectors Found:", parsedSelectors);

  await checkBaseLineProperties();
}

function handleJSXElement(
  path: NodePath<t.JSXOpeningElement>,
  document: vscode.TextDocument
) {
  if (!t.isJSXIdentifier(path.node.name)) {
    return;
  }
  const node = path.node.name;
  if (node.range) {
    tagNames.push({
      tag: node.name,
      start: node.range[0],
      end: node.range[1],
      document: document,
    });
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
    if (t.isJSXEmptyExpression(expr)) {
      return;
    }
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
    if (!cls.trim()) {
      return;
    }
    const idx = raw.indexOf(cls);
    if (idx !== -1) {
      classRanges.push({
        className: cls,
        start: offset + idx,
        end: offset + idx + cls.length,
        document: document,
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
      document,
    });
  }

  if (/^on[A-Z]/.test(name) && path.node.name.range) {
    eventHandlers.push({
      event: name,
      start: path.node.name.range[0],
      end: path.node.name.range[1],
      document,
    });
  }

  // className
  const valueNode = path.node.value;
  if (name === "className" && valueNode) {
    handleClassNames(valueNode as any, document);
  }

  // inline styles
  if (name === "style" && valueNode && t.isJSXExpressionContainer(valueNode)) {
    const expr = valueNode.expression;
    if (t.isObjectExpression(expr)) {
      handleInlineStyle(expr, document);
    }
  }
}

function isStyledExpression(node: t.Node): boolean {
  if (t.isIdentifier(node, { name: "styled" })) {return true;}

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

// // Main handler for a TaggedTemplateExpression
// function handleStyledComponent(path: NodePath<t.TaggedTemplateExpression>, document: any) {
//   const tag = path.node.tag;

//   if (isStyledExpression(tag)) {
//     const quasi = path.node.quasi;
//     let cssText = quasi.quasis.map((q) => q.value.raw).join("\n");
//      cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, ''); // removes the comment
//      cssText = cssText.replace(/\n/g,' ');
//     console.log(cssText);
//     styledComponents.push({
//       css: cssText,
//       start: path.node.start ?? 0,
//       end: path.node.end ?? 0,
//       document,
//     });
//   }
// }

function handleInlineStyle(
  expr: t.ObjectExpression,
  document: vscode.TextDocument
) {
  expr.properties.forEach((prop) => {
    if (!t.isObjectProperty(prop)) {return;}
    if (!t.isIdentifier(prop.key) && !t.isStringLiteral(prop.key)) {return;}

    const keyName = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;

    // Convert camelCase → kebab-case (backgroundColor → background-color)
    const cssProp = keyName
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();

    inlineComponents.push({
      css: cssProp, // ✅ only property name, no value
      start: prop.key.start ?? 0,
      end: prop.key.end ?? 0,
      document,
    });
  });
}

// REVISED Main handler for a TaggedTemplateExpression
export async function handleStyledComponent(
  path: NodePath<t.TaggedTemplateExpression>,
  document: any
) {
  const tag = path.node.tag;

  if (isStyledExpression(tag)) {
    const quasi = path.node.quasi;
    // Get the raw CSS text, keeping newlines for accurate positioning.
    const cssText = quasi.quasis.map((q) => q.value.raw).join("");
    // The template literal's starting position in the file.
    // We add 1 to skip the opening backtick (`).
    const baseOffset = (quasi.start ?? 0) + 1;

    try {
      // Parse the CSS text using PostCSS with a safe parser
      const result = await postcss().process(cssText, {
        from: undefined,
        parser: safeParser,
      });

      // 1. Walk through all declarations (properties)
      result.root.walkDecls((decl) => {
        if (decl.source?.start) {
          parsedDeclarations.push({
            property: decl.prop,
            value: decl.value,
            // Calculate the absolute start/end position in the source file
            start: baseOffset + decl.source.start.offset,
            end:
              baseOffset +
              (decl.source.end?.offset ??
                decl.source.start.offset +
                  decl.prop.length +
                  decl.value.length +
                  1),
            document,
          });
        }
      });

      // 2. Walk through all rules (selectors)
      result.root.walkRules((rule) => {
        if (rule.source?.start) {
          parsedSelectors.push({
            selector: rule.selector,
            start: baseOffset + rule.source.start.offset,
            end:
              baseOffset +
              (rule.source.end?.offset ??
                rule.source.start.offset + rule.selector.length),
            document,
          });
        }
      });
    } catch (err) {
      console.error(`Error parsing styled-component CSS:`, err);
    }
  }
}
