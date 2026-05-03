/**
 * Shared type definitions for the location discovery application.
 * 
 * Includes:
 * - Chat message shapes (user, assistant, tool responses)
 * - Location search parameters and results
 * - GeoJSON geometry and feature types for map rendering
 * - Map view configuration
 */

/** Role of a message in the conversation: user input, AI response, or tool result. */
export type MessageRole = 'user' | 'assistant' | 'tool';

/**
 * A single message in the conversation history.
 * 
 * @property id - Unique identifier (UUID)
 * @property role - Who sent this message (user, assistant, or tool)
 * @property content - Message text or summary
 * @property toolName - Name of the tool that produced this message (only for role='tool')
 * @property createdAt - ISO 8601 timestamp
 */
export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolName?: string;
  createdAt: string;
}

/**
 * Parameters for a location search query.
 * 
 * @property query - Required search term (e.g., "coffee shops", "parks")
 * @property near - Optional place name to anchor the search (e.g., "Bugis")
 * @property limit - Optional max result count (defaults to 8)
 */
export interface LocationSearchArgs {
  query: string;
  near?: string;
  limit?: number;
}

/**
 * GeoJSON Point geometry: a single [longitude, latitude] coordinate.
 * 
 * Used for pinpointing a specific location on the map.
 * 
 * @example
 * { type: 'Point', coordinates: [103.8198, 1.3521] } // Singapore
 */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * GeoJSON Polygon geometry: a closed boundary defined by coordinate rings.
 * 
 * First ring is the outer boundary; additional rings are holes. Used for rendering
 * neighborhood, district, or building boundaries on the map.
 * 
 * @example
 * {
 *   type: 'Polygon',
 *   coordinates: [
 *     [[103.8, 1.35], [103.82, 1.35], [103.82, 1.37], [103.8, 1.37], [103.8, 1.35]]
 *   ]
 * }
 */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/**
 * GeoJSON MultiPolygon geometry: multiple disjoint polygons.
 * 
 * Used for regions with multiple separate boundaries (e.g., island groups,
 * non-contiguous administrative areas).
 */
export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

/** Union type for all supported GeoJSON geometry types: Point, Polygon, or MultiPolygon. */
export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon | GeoJsonMultiPolygon;

/**
 * Metadata properties of a location, stored in a GeoJSON Feature.
 * 
 * Used for map tooltips, popups, and interactive layers to display
 * location details on hover or click.
 */
export interface LocationFeatureProperties {
  id: string;
  name: string;
  displayName: string;
  category: string;
  summary: string;
}

/**
 * Complete location record: geometry + metadata for a search result.
 * 
 * Used internally by the app to store location data before converting to GeoJSON.
 * Contains both structural data (geometry) and display data (name, category).
 * 
 * @property id - Unique identifier (e.g., "W12345" for OpenStreetMap ways)
 * @property name - Short label for compact UI display (first part of address)
 * @property displayName - Full address/name from Nominatim
 * @property category - Place type classification (e.g., "amenity / cafe")
 * @property latitude - Y-coordinate for quick access
 * @property longitude - X-coordinate for quick access
 * @property summary - Short description of place type
 * @property geometry - GeoJSON geometry (Point or Polygon)
 */
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

/**
 * GeoJSON Feature: a location with geometry and properties.
 * 
 * Standard GeoJSON envelope used by deck.gl and map rendering libraries.
 * Combines geometry (where) with metadata (what/who).
 */
export interface GeoJsonFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJsonGeometry;
  properties: LocationFeatureProperties;
}

/**
 * GeoJSON FeatureCollection: a set of Features.
 * 
 * Container for multiple locations, passed directly to deck.gl's GeoJsonLayer
 * for rendering all search results on the map.
 */
export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/**
 * Complete result of a location search operation.
 * 
 * Contains both the raw location records and a GeoJSON FeatureCollection
 * for efficient map rendering.
 * 
 * @property locations - Array of LocationRecord for state/logic management
 * @property featureCollection - GeoJSON format for deck.gl rendering
 */
export interface LocationSearchResult {
  locations: LocationRecord[];
  featureCollection: GeoJsonFeatureCollection;
}

/**
 * Map camera configuration for deck.gl / react-map-gl.
 * 
 * Defines where the map is centered, how zoomed-in, and its orientation.
 * Updated by calculateViewState() to auto-fit search results.
 * 
 * @property longitude - Center X-coordinate
 * @property latitude - Center Y-coordinate
 * @property zoom - Zoom level (5.5 = zoomed out; 16.5 = very close)
 * @property bearing - Rotation in degrees (0 = north is up)
 * @property pitch - Tilt in degrees (0 = flat; 60 = 3D view)
 * 
 * @example
 * {
 *   longitude: 103.8198,
 *   latitude: 1.3521,
 *   zoom: 13,
 *   bearing: 0,
 *   pitch: 0
 * } // Centered on Singapore, default view
 */
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}
