import { tagNames, attributes, eventHandlers,classRanges } from './../extension';
import { addDiagnosticRange, checkBaselineUserRequirements } from '../diagonistic';
import { getConvertedClasses } from './tailwind-to-css';
export async function checkBaseLineProperties(){
    checkBaselineForTags();
    checkBaselineForAttributes();
    checkBaselineForEvents();
    checkBaselineForClassNames();
}


async function checkBaselineFeature(featureKey: string) {
  const { features } = await import("web-features");
  return features[featureKey] || null;
}

async function checkBaselineForTags() {
  for (const { tag } of tagNames) {
    const htmlTag = tag.toLowerCase();
    try {
      const result = await checkBaselineFeature(`html.elements.${htmlTag}`);
      if (!result) {console.log(`No baseline for HTML tag: ${htmlTag}`)};
    } catch {}
  }
}

async function checkBaselineForAttributes() {
  for (const { prop } of attributes) {
    const key = prop.toLowerCase();
    try {
      const result = await checkBaselineFeature(`html.attributes.${key}`);
      if (!result) {console.log(`No baseline for attribute: ${key}`)};
    } catch {}
  }
}

async function checkBaselineForEvents() {
  for (const { event } of eventHandlers) {
    try {
      const result = await checkBaselineFeature(`html.events.${event}`);
      if (!result){ console.log(`No baseline for event: ${event}`)};
    } catch {}
  }
}

async function checkBaselineForClassNames() {
  for (const  className  of classRanges) {
    const csstag = getConvertedClasses(className.className); //display:flex; form <- extract value and key
    const key = csstag.split(":")[0];
    const value = csstag.split(":")[1];
    console.log(key,value);
    try {
        //checking for value
      const result = await checkBaselineFeature(`${key}`);
      if(result.kind === "feature"){
        checkBaselineUserRequirements(result,className.document,className.start,className.end,"fw");
      }
      if (!result) {console.log(`No baseline for this css class`)};
    } catch {}
  }
}