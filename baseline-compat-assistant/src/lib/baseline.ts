import { tagNames, attributes, eventHandlers,classRanges } from './../extension';
import { addDiagnosticRange, checkBaselineUserRequirements } from '../diagonistic';
import { getConvertedClasses } from './tailwind-to-css';
import postcss from "postcss";
import safeParser from "postcss-safe-parser";
export async function checkBaseLineProperties(){
    checkBaselineForTags();
    checkBaselineForAttributes();
    checkBaselineForEvents();
    checkBaselineForClassNames();
}


async function checkBaselineFeature(featureKey: string) {
  const { getStatus } = await import("compute-baseline");
  return getStatus[featureKey] || null;
}

async function checkBaselineForTags() {
  for (const { tag } of tagNames) {
    const htmlTag = tag.toLowerCase();
    try {
      const result = await checkBaselineFeature(`html.elements.${htmlTag}`);
     
    } catch {}
  }
}

async function checkBaselineForAttributes() {
  for (const { prop } of attributes) {
    const key = prop.toLowerCase();
    try {
      const result = await checkBaselineFeature(`html.attributes.${key}`);
     
    } catch {}
  }
}

async function checkBaselineForEvents() {
  for (const { event } of eventHandlers) {
    try {
      const result = await checkBaselineFeature(`html.events.${event}`);
   
    } catch {}
  }
}

async function checkBaselineForClassNames() {

  for (const className of classRanges) {
   
 let cssText = getConvertedClasses(className.className);
  
    console.log(cssText);
    cssText = ` p {${cssText}}`;
 
    const result = await postcss().process(cssText, { parser: safeParser });
   

    const root = result.root;

    const tasks: Promise<void>[] = [];

    root.walkRules(rule => {
      rule.walkDecls(decl => {
        tasks.push((async () => {
          const propertyKey = `css.properties.${decl.prop}`;
          console.log(propertyKey);
          const results = await checkBaselineFeature(propertyKey);
          checkBaselineUserRequirements(
            results,
            className.document,
            className.start,
            className.end,
            "fw"
          );
        })());
      });
    });

    // Wait for all decl checks in this class
    await Promise.all(tasks);
  }
}


