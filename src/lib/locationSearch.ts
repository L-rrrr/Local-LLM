import type { GeoJsonFeature, GeoJsonFeatureCollection, LocationRecord, LocationSearchArgs, LocationSearchResult } from '../types';
import { getRepresentativeLocation } from './geo';

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  importance?: number;
  geojson?: unknown;
}

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

function buildSearchQuery(args: LocationSearchArgs): string {
  return args.near ? `${args.query} near ${args.near}` : args.query;
}

function buildGeometry(result: NominatimResult) {
  if (result.geojson && typeof result.geojson === 'object') {
    return result.geojson as LocationRecord['geometry'];
  }

  return {
    type: 'Point' as const,
    coordinates: [Number(result.lon), Number(result.lat)] as [number, number],
  };
}

function createSummary(result: NominatimResult): string {
  return [result.class, result.type].filter(Boolean).join(' / ');
}

function toLocationRecord(result: NominatimResult): LocationRecord {
  const geometry = buildGeometry(result);
  const [longitude, latitude] = getRepresentativeLocation(geometry);
  const category = createSummary(result) || 'place';
  const name = result.display_name.split(',')[0]?.trim() ?? result.display_name;

  return {
    id: `${result.osm_type}-${result.osm_id}`,
    name,
    displayName: result.display_name,
    category,
    latitude,
    longitude,
    summary: category,
    geometry,
  };
}

function toFeature(location: LocationRecord): GeoJsonFeature {
  return {
    type: 'Feature',
    id: location.id,
    geometry: location.geometry,
    properties: {
      id: location.id,
      name: location.name,
      displayName: location.displayName,
      category: location.category,
      summary: location.summary,
    },
  };
}

export async function locationSearch(args: LocationSearchArgs): Promise<LocationSearchResult> {
  const query = buildSearchQuery(args);
  const searchUrl = new URL(NOMINATIM_ENDPOINT);

  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('format', 'jsonv2');
  searchUrl.searchParams.set('addressdetails', '1');
  searchUrl.searchParams.set('namedetails', '1');
  searchUrl.searchParams.set('polygon_geojson', '1');
  searchUrl.searchParams.set('limit', String(args.limit ?? 8));
  searchUrl.searchParams.set('dedupe', '1');

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }

  const results = (await response.json()) as NominatimResult[];
  const locations = results.map(toLocationRecord);
  const featureCollection: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: locations.map(toFeature),
  };

  return {
    locations,
    featureCollection,
  };
}
