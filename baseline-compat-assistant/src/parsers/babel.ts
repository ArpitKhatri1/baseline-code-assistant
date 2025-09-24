import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { checkBaselineFeature } from "../baseline-check/baseline-checker";

const code = `
<section style={{ scrollSnapAlign: "center" }}>
  <div style={{ aspectRatio: "16/9", backdropFilter: "blur(10px)" }}>Test</div>
</section>
`;

const ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"] });
const baselineCSS: Record<string, string[]> = {
  "backdrop-filter": ["chrome < 76", "firefox < 70"],
  "aspect-ratio": ["safari < 15"],
  "scroll-snap-align": ["ie 11", "edge < 16"]
};

async function checkCSSProperty(prop: string) {
  const propLower = prop.toLowerCase();
  const ans = await checkBaselineFeature(propLower);
  console.log(ans);
}

function jsToCssProp(prop: string) {
  return prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}


traverse(ast, {
  JSXAttribute(path) {

    if (t.isJSXIdentifier(path.node.name, { name: "style" })) {
      const val = path.node.value;
      if (
        t.isJSXExpressionContainer(val) &&
        t.isObjectExpression(val.expression)
      ) {
        val.expression.properties.forEach((propNode) => {
          if (t.isObjectProperty(propNode)) {
            if (t.isIdentifier(propNode.key)) {
             
               checkCSSProperty(jsToCssProp(propNode.key.name))
            } else if (t.isStringLiteral(propNode.key)) {
              console.log("Found inline style:", propNode.key.value);
            }
          }
        });
      }
    }
  },
});
