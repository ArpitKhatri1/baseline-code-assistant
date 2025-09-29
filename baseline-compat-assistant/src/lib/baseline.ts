import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { safeParser } from "postcss-safe-parser";
import fs from "fs";

import { classRanges, eventHandlers, tagNames, attributes } from "../extension";
import { checkBaselineUserRequirements } from "../diagonistic";
import path from "path";

// --- Main entry ---
export async function checkBaseLineProperties() {
  // await checkBaselineForTags();
  // await checkBaselineForAttributes();
  // await checkBaselineForEvents();
  await checkBaselineForClassNames();
}

// --- Helpers ---
async function checkBaselineFeature(featureKey: string) {
  try {
    const { getStatus } = await import("compute-baseline");
    return getStatus("css",featureKey) || null;
  } catch {
    return null;
  }
}

// Check HTML tags
async function checkBaselineForTags() {
  for (const { tag } of tagNames) {
    const key = `html.elements.${tag.toLowerCase()}`;
    const result = await checkBaselineFeature(key);
    // call diagnostic if needed
  }
}

// Check HTML attributes
async function checkBaselineForAttributes() {
  for (const { prop } of attributes) {
    const key = `html.attributes.${prop.toLowerCase()}`;
    const result = await checkBaselineFeature(key);
  }
}

// Check event handlers
async function checkBaselineForEvents() {
  for (const { event } of eventHandlers) {
    const key = `html.events.${event}`;
    const result = await checkBaselineFeature(key);
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

      // --- NEW FIX ---
      // Explicitly disable the preflight (base styles) plugin.
      // This will stop Tailwind from trying to find the preflight.css file.
      corePlugins: {
        preflight: false,
      },
      // --- END FIX ---
    }),
  ]).process(inputCss, { from: undefined, parser: safeParser });

  return result.css;
}
// Check Tailwind class names
async function checkBaselineForClassNames() {
  console.log("classranges", classRanges);

  for (const classNameObj of classRanges) {
    try {
      const cssText = await compileClassesToCSS([classNameObj.className]);

      // Parse CSS safely
      const result = await postcss().process(cssText, { parser: safeParser });
      const root = result.root;

      const tasks: Promise<void>[] = [];

      root.walkDecls((decl) => {
        tasks.push(
          (async () => {
            const propertyKey = `css.properties.${decl.prop}`;
            console.log(propertyKey);

            const results = await checkBaselineFeature(propertyKey);
            console.log("hi");
            console.log("the results",results)
            if (results) {
              checkBaselineUserRequirements(
                results,
                classNameObj.document,
                classNameObj.start,
                classNameObj.end,
                "fw"
              );
            }
          })() as Promise<void>
        );
      });

      await Promise.all(tasks);
    } catch (err) {
      console.error(`Error processing class "${classNameObj.className}":`, err);
    }
  }
}
