import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { safeParser } from "postcss-safe-parser";
import fs from "fs";

import { classRanges, eventHandlers, tagNames, attributes,styledComponents,inlineComponents } from "../extension";
import { checkBaselineUserRequirements } from "../diagonistic";
import path from "path";
import { parse,walk,generate } from 'css-tree';
import {parse as parseCSSWalk} from 'css-what' ;
import { parsedDeclarations,parsedSelectors } from "../parsers/babel";

// --- Main entry ---
export async function checkBaseLineProperties() {
  await checkBaselineForTags();
  // skip the attributes
  // await checkBaselineForAttributes();
  // await checkBaselineForEvents();
  await checkBaselineForClassNames();
  await checkBaselineForStyleCompoenents();
  await checkBaselineForInlineComponents();
  await checkBaselineParsedDeclarations();
  await checkBaselineParsedSelectors();

}

async function checkBaselineForInlineComponents(){
  for (const cssObj of inlineComponents){
    const cssSearch = `css.properties.${cssObj.css}`;
    const result = await checkBaselineFeature("css",cssSearch);
    
    if(result){
      checkBaselineUserRequirements(result,cssObj.document,cssObj.start,cssObj.end,cssObj.css);
    }
  }
}

async function checkBaselineParsedDeclarations(){
  for (const prop of parsedDeclarations){
    const cssSearch = `css.properties.${prop.property}`;
     const result = await checkBaselineFeature("css",cssSearch);
    
    if(result){ 
      checkBaselineUserRequirements(result,prop.document,prop.start,prop.end,prop.property);
    }
  }
}

async function checkBaselineParsedSelectors(){
  for( const prop of parsedSelectors){
  const selectorKeys =  getSelectorFeatureKeys(prop.selector)[0];
      const result = await checkBaselineFeature("css",selectorKeys);
    
    if(result){
      checkBaselineUserRequirements(result,prop.document,prop.start,prop.end,prop.selector);
    }
  } 
}

// --- Helpers ---
async function checkBaselineFeature(file: string, featureKey: string) {
  try {
    const { getStatus } = await import("compute-baseline");
    return getStatus(file, featureKey) || null;
  } catch {
    return null;
  }
}

// Check HTML tags
async function checkBaselineForTags() {
  for (const { tag } of tagNames) {
    const key = `html.elements.${tag.toLowerCase()}`;
    const result = await checkBaselineFeature("html", key);

    // console.log(key, result);
    // call diagnostic if needed
  }
}

// Check HTML attributes
async function checkBaselineForAttributes() {
  for (const { prop } of attributes) {
    const key = `html.attributes.${prop.toLowerCase()}`;
    const result = await checkBaselineFeature("html", key);
    console.log(key, result);
  }
}

async function checkBaselineForStyleCompoenents(){

}

// Check event handlers
async function checkBaselineForEvents() {
  for (const { event } of eventHandlers) {
    const key = `html.events.${event}`;
    const result = await checkBaselineFeature("html", key);
  }
}
export async function compileClassesToCSS(classes: string[]): Promise<string> {
  const htmlContent = `<div class="${classes.join(" ")}"></div>`;

  // We only need utilities, so we keep this minimal.
  const inputCss = `
    @tailwind utilities;
  `;

  const result = await postcss([
    tailwindcss({
      // Provide content to scan for classes
      content: [{ raw: htmlContent, extension: "html" }],

     
      corePlugins: {
        preflight: false,
      },
      // --- END FIX ---
    }),
  ]).process(inputCss, { from: undefined, parser: safeParser });

  return result.css;
}
async function checkBaselineForClassNames() {
  for (const classNameObj of classRanges) {
    try {
      const cssText = await compileClassesToCSS([classNameObj.className]);
    
      const result = await postcss().process(cssText, { parser: safeParser });
      const root = result.root;

      const tasks: Promise<void>[] = [];

      // Walk properties (declarations)
      root.walkDecls((decl) => {
        tasks.push(
          (async () => {
            const propertyKey = `css.properties.${decl.prop}`;
            const results = await checkBaselineFeature("css", propertyKey);

            if (results) {
              checkBaselineUserRequirements(
                results,
                classNameObj.document,
                classNameObj.start,
                classNameObj.end,
                propertyKey
              );
            }
          })()
        );
      });

      // Walk selectors (rules)
      root.walkRules((rule) => {
        tasks.push(
          (async () => {
            const featureKeys = getSelectorFeatureKeys(rule.selector);

            for (const key of featureKeys) {
              const results = await checkBaselineFeature("css", key);
              if (results) {
                checkBaselineUserRequirements(
                  results,
                  classNameObj.document,
                  classNameObj.start,
                  classNameObj.end,
                  key
                );
              }
            }
          })()
        );
      });

      await Promise.all(tasks);
    } catch (err) {
      console.error(`Error processing class "${classNameObj.className}":`, err);
    }
  }
}

function getSelectorFeatureKeys(selector: string): string[] {
   const cleanSelector = selector.trim().startsWith('&') ? selector.trim().substring(1) : selector;
  const ast = parseCSSWalk(cleanSelector);
  const keys: string[] = [];

  ast.forEach((selectors) => {
    selectors.forEach((token) => {
      if (token.type === "pseudo") {
        // pseudo-class
        switch (token.name.toLowerCase()) {
          case "hover":
            keys.push("css.selectors.hover");
            break;
          case "focus":
            keys.push("css.selectors.focus");
            break;
          case "has":
            keys.push("css.selectors.has");
            break;
          case "nth-child":
            keys.push("css.selectors.nth-child");
            break;
          case "nth-of-type":
            keys.push("css.selectors.nth-of-type");
            break;
          default:
            keys.push(`css.selectors.${token.name.toLowerCase()}`);
        }
      }

      if (token.type === "pseudo-element") {
        // pseudo-element
        keys.push(`css.pseudo-elements.${token.name.toLowerCase()}`);
      }
    });
  });

  return keys;
}
