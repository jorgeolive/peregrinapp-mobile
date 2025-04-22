export interface AlbergueFeature {
  properties: {
    name: string;
    id: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
  };
}

export interface AlbergueDetails {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  price?: string;
}

export interface MapStyle {
  version: number;
  glyphs: string;
  sources: {
    [key: string]: {
      type: string;
      tiles: string[];
      tms?: boolean;
      minzoom?: number;
      maxzoom?: number;
    };
  };
  layers: any[];
  center: [number, number];
  zoom: number;
  minzoom: number;
  maxzoom: number;
  maxBounds: [[number, number], [number, number]];
} 