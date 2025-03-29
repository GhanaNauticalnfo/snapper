// features/kml/models/kml-dataset.model.ts
export interface KmlDataset {
  id: number;
  created: Date;
  last_updated: Date;
  kml: string;
  name: string;
  enabled: boolean;
}