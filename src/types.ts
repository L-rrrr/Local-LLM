export type MessageRole = 'user' | 'assistant' | 'tool';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolName?: string;
  createdAt: string;
}

export interface LocationSearchArgs {
  query: string;
  near?: string;
  limit?: number;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon | GeoJsonMultiPolygon;

export interface LocationFeatureProperties {
  id: string;
  name: string;
  displayName: string;
  category: string;
  summary: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  displayName: string;
  category: string;
  latitude: number;
  longitude: number;
  summary: string;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJsonGeometry;
  properties: LocationFeatureProperties;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface LocationSearchResult {
  locations: LocationRecord[];
  featureCollection: GeoJsonFeatureCollection;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}
