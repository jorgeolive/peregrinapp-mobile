export interface AlbergueFeature {
  id: string;
  properties: {
    name: string;
    id: string;
    description?: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  type: string;
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