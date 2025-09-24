

export async function checkBaselineFeature(featureKey:string){
    const {features} = await import("web-features");
    return features[featureKey];
}