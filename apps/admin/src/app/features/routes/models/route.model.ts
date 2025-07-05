export interface Waypoint {
  id?: string;
  lat: number;
  lng: number;
  name?: string;
  order: number;
}

export interface Route {
  id?: number;
  name: string;
  description?: string;
  waypoints: Waypoint[];
  created?: Date;
  last_updated?: Date;
  enabled: boolean;
}