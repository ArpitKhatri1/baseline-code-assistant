export interface FeatureStatusSupport {
  chrome?: string;
  chrome_android?: string;
  edge?: string;
  firefox?: string;
  firefox_android?: string;
  safari?: string;
  safari_ios?: string;
}

export interface FeatureStatus {
  baseline: string;
  baseline_low_date?: string;
  support: FeatureStatusSupport;
}

export interface Feature {
  caniuse: string;
  compat_features: string[];
  description: string;
  description_html: string;
  group: string;
  name: string;
  spec: string;
  status: FeatureStatus;
}
