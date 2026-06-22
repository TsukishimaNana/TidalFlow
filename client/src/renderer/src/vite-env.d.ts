/// <reference types="vite/client" />

interface TidalFlowApi {
  platform: string;
  versions: {
    chrome?: string;
    electron?: string;
    node?: string;
  };
}

interface Window {
  tidalflow: TidalFlowApi;
}
