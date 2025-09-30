// Types for the API response structure

export interface WebBaselineApiResponse {
  data: FeatureData[];
  metadata: {
    total: number;
  };
}

export interface FeatureData {
  baseline: BaselineInfo;
  browser_implementations: BrowserImplementations;
  feature_id: string;
  name: string;
  spec: Spec;
  usage?: Usage; // optional if sometimes missing
}

export interface BaselineInfo {
  high_date?: string;  // only present if status = "widely"
  low_date?: string;   // present if status = "newly" or “widely”
  status: "limited" | "newly" | "widely";
}

export interface BrowserImplementations {
  chrome?: BrowserSupport;
  chrome_android?: BrowserSupport;
  edge?: BrowserSupport;
  firefox?: BrowserSupport;
  firefox_android?: BrowserSupport;
  safari?: BrowserSupport;
  safari_ios?: BrowserSupport;
  [browser: string]: BrowserSupport | undefined; // allow additional ones
}

export interface BrowserSupport {
  date: string;   // e.g. "2017-03-09"
  status: string; // e.g. "available" (could also be other statuses depending on API)
  version: string;
}

export interface Spec {
  links: SpecLink[];
}

export interface SpecLink {
  link: string;
  // you can add title or other metadata if API supports
}

export interface Usage {
  [browser: string]: {
    daily: number;
    // possibly other metrics (weekly, monthly) if API returns more
  };
}

