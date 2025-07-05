export interface NiordMessageDescription {
    lang: string;
    name: string;
  }
  
  export interface NiordArea {
    id: number;
    mrn: string;
    active: boolean;
    descs: NiordMessageDescription[];
  }
  
  export interface NiordMessageSeries {
    seriesId: string;
  }
  
  export interface NiordMessage {
    id: string;
    created: number;
    updated: number;
    messageSeries: NiordMessageSeries;
    number: number;
    shortId: string;
    mainType: string;
    type: string;
    status: string;
    areas: NiordArea[];
    publishDateFrom: number;
    originalInformation: boolean;
  }
  
  export interface NiordResponse {
    data: NiordMessage[];
  }