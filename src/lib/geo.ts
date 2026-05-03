import type { GeoJsonGeometry, LocationRecord, MapViewState } from '../types';

type Coordinate = [number, number];

const SINGAPORE_VIEW: MapViewState = {
  longitude: 103.8198,
  latitude: 1.3521,
  zoom: 11,
  bearing: 0,
  pitch: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function flattenCoordinates(geometry: GeoJsonGeometry): Coordinate[] {
  if (geometry.type === 'Point') {
    return [geometry.coordinates];
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }

  return geometry.coordinates.flat(2);
}

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
