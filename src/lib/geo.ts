/**
 * Geospatial utilities for map rendering and location calculations.
 * 
 * Handles coordinate normalization, bounding box calculation, zoom level computation,
 * and automatic map view fitting for location search results.
 */

import type { GeoJsonGeometry, LocationRecord, MapViewState } from '../types';

type Coordinate = [number, number];

/**
 * Default map view centered on Singapore.
 * Used as fallback when no location data is available.
 */
const SINGAPORE_VIEW: MapViewState = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 11,
  bearing: 0,
  pitch: 0,
};

/**
 * Clamps a numeric value between min and max bounds.
 * 
 * @param value - The number to constrain
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns The clamped value, guaranteed to be within [min, max]
 * 
 * @example
 * clamp(15, 5, 10) // returns 10
 * clamp(7, 5, 10)  // returns 7
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Converts any GeoJSON geometry into a flat array of coordinate pairs.
 * 
 * Normalizes different geometry types (Point, Polygon, MultiPolygon, etc.) into
 * a consistent [longitude, latitude] array for coordinate processing.
 * 
 * @param geometry - GeoJSON geometry object (Point, Polygon, LineString, etc.)
 * @returns Flat array of [longitude, latitude] coordinate pairs
 * 
 * @example
 * // Point: [[lon, lat]]
 * flattenCoordinates({ type: 'Point', coordinates: [103.8, 1.35] })
 * // -> [[103.8, 1.35]]
 * 
 * // Polygon: all coordinates from all rings
 * flattenCoordinates({ type: 'Polygon', coordinates: [[[lon1, lat1], [lon2, lat2], ...]] })
 * // -> [[lon1, lat1], [lon2, lat2], ...]
 */
function flattenCoordinates(geometry: GeoJsonGeometry): Coordinate[] {
  if (geometry.type === 'Point') {
    return [geometry.coordinates];
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}

/**
 * Computes the centroid (center point) of a geometry.
 * 
 * Averages all coordinates in the geometry to find a representative location
 * for points, regions, and polygons. Falls back to Singapore's center if the
 * geometry has no coordinates.
 * 
 * @param geometry - GeoJSON geometry object
 * @returns [longitude, latitude] coordinate of the centroid
 * 
 * @example
 * // For a polygon boundary, returns its center point
 * const center = getRepresentativeLocation(polygonGeometry)
 * // -> [103.82, 1.35] (approximate Singapore CBD)
 */
export function getRepresentativeLocation(geometry: GeoJsonGeometry): Coordinate {
  const coordinates = flattenCoordinates(geometry);

  if (coordinates.length === 0) {
    return [SINGAPORE_VIEW.longitude, SINGAPORE_VIEW.latitude];
  }

  const total = coordinates.reduce(
    (accumulator, coordinate) => {
      accumulator.longitude += coordinate[0];
      accumulator.latitude += coordinate[1];
      return accumulator;
    },
    { longitude: 0, latitude: 0 },
  );

  return [total.longitude / coordinates.length, total.latitude / coordinates.length];
}

/**
 * Calculates the optimal map view to fit all locations in the viewport.
 * 
 * Computes bounding box, center, and zoom level to frame all search results.
 * Used after location searches to automatically pan/zoom the map to show all hits.
 * 
 * @param locations - Array of location records with geometries
 * @returns MapViewState with longitude, latitude, zoom, bearing=0, pitch=0
 * 
 * @algorithm
 * 1. Flatten all coordinates from all locations
 * 2. Compute min/max for latitude and longitude (bounding box)
 * 3. Calculate center point as midpoint of bounds
 * 4. Compute span (larger of width or height)
 * 5. Convert span to zoom: 13 - log₂(span * 100), clamped to [5.5, 16.5]
 * 
 * @example
 * // Auto-fit 3 locations in Marina Bay
 * const state = calculateViewState(marineLocations)
 * // -> { longitude: 103.86, latitude: 1.29, zoom: 14, bearing: 0, pitch: 0 }
 */
export function calculateViewState(locations: LocationRecord[]): MapViewState {
  if (locations.length === 0) {
    return SINGAPORE_VIEW;
  }

  const coordinates = locations.flatMap((location) => flattenCoordinates(location.geometry));

  if (coordinates.length === 0) {
    return SINGAPORE_VIEW;
  }

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitude = (minLongitude + maxLongitude) / 2;
  const latitude = (minLatitude + maxLatitude) / 2;
  const span = Math.max(maxLongitude - minLongitude, maxLatitude - minLatitude, 0.01);
  const zoom = clamp(13 - Math.log2(span * 100), 5.5, 16.5);

  return {
    longitude,
    latitude,
    zoom,
    bearing: 0,
    pitch: 0,
  };
}
