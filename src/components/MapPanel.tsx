/**
 * Map rendering component using deck.gl + react-map-gl.
 * 
 * Displays location search results on an interactive map with:
 * - Polygon/boundary layers for administrative areas
 * - Point layers for individual locations
 * - Click selection and hover tooltips
 * - Auto-fit viewport when results arrive
 */

import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { StyleSpecification } from 'maplibre-gl';
import Map from 'react-map-gl/maplibre';
import type { GeoJsonFeature, GeoJsonFeatureCollection, LocationRecord, MapViewState } from '../types';
import { calculateViewState } from '../lib/geo';

/**
 * MapLibre style configuration for OpenStreetMap base tiles.
 * Provides raster tile source and basic layer styling.
 */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'openstreetmap-raster',
      type: 'raster',
      source: 'openstreetmap',
    },
  ],
};

/**
 * Props for the MapPanel component.
 * 
 * @property locations - Array of location records with geometries to display
 * @property featureCollection - GeoJSON features for deck.gl layer rendering
 * @property selectedLocationId - ID of the currently selected location (for highlighting)
 * @property onSelectLocation - Callback to notify parent when user clicks a location
 */
interface MapPanelProps {
  locations: LocationRecord[];
  featureCollection: GeoJsonFeatureCollection;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
}

/**
 * Type guard: checks if a GeoJSON feature has Point geometry.
 * Used to separate point features from polygons for layer filtering.
 */
function isPointFeature(feature: GeoJsonFeature): boolean {
  return feature.geometry.type === 'Point';
}

/**
 * Main map UI component.
 * 
 * Orchestrates deck.gl layers, camera state, and interactive overlays.
 * Auto-fits map when locations change, handles hover/click selection, and displays
 * tooltips and detail cards for locations.
 */
export function MapPanel({
  locations,
  featureCollection,
  selectedLocationId,
  onSelectLocation,
}: MapPanelProps) {
  /**
   * Map camera position, zoom, and orientation state.
   * Updated when user pans/zooms or when locations change.
   */
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 103.8198,
    latitude: 1.3521,
    zoom: 11,
    bearing: 0,
    pitch: 0,
  });

  /**
   * Hovering state: stores tooltip position and hovered location.
   * Shown near cursor when user hovers over map features.
   * Cleared when mouse leaves or when interacting with map.
   */
  const [hoveredLocation, setHoveredLocation] = useState<{
    x: number;
    y: number;
    location: LocationRecord;
  } | null>(null);

  /**
   * Auto-fit map when results change.
   * Merges calculated view state (bounds + zoom) with current state.
   * Preserves bearing/pitch unless map is tilted by user.
   */
  useEffect(() => {
    setViewState((current) => ({
      ...current,
      ...calculateViewState(locations),
    }));
  }, [locations]);

  /**
   * Resolves the full location object from selectedLocationId for UI display.
   * Used to render selected-location card and overlay text.
   */
  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;

  /**
   * Updates tooltip state when user hovers over a map feature.
   * 
   * @param locationId - ID of the hovered location (null to hide tooltip)
   * @param x - Cursor X position in viewport pixels
   * @param y - Cursor Y position in viewport pixels
   * 
   * Tooltip is positioned near cursor, constrained to stay within viewport bounds.
   */
  function updateHoveredLocation(locationId: string | null, x: number, y: number) {
    if (!locationId) {
      setHoveredLocation(null);
      return;
    }

    const location = locations.find((candidate) => candidate.id === locationId);
    if (!location) {
      setHoveredLocation(null);
      return;
    }

    setHoveredLocation({ x, y, location });
  }

  /**
   * Memoized deck.gl layers (polygon + scatterplot).
   * 
   * Re-created only when dependencies change, not on every render.
   * 
   * Layer 1: GeoJsonLayer for polygon/boundary features
   * - Renders filled teal polygons with dark outlines
   * - Supports click and hover interactions
   * 
   * Layer 2: ScatterplotLayer for point locations
   * - Renders colored circles for individual places
   * - Changes color (orange) when selected
   * - Supports click and hover interactions
   */
  const layers = useMemo(() => {
    const pointFeatures = featureCollection.features.filter(isPointFeature);

    return [
      new GeoJsonLayer({
        id: 'location-polygons',
        data: featureCollection,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: [16, 118, 110, 50],
        getLineColor: [15, 23, 42, 180],
        lineWidthMinPixels: 1,
        onClick: (info: PickingInfo<GeoJsonFeature>) => {
          onSelectLocation(info.object?.id ?? null);
        },
        onHover: (info: PickingInfo<GeoJsonFeature>) => {
          updateHoveredLocation(info.object?.id ?? null, info.x ?? 0, info.y ?? 0);
        },
      }),
      new ScatterplotLayer<LocationRecord>({
        id: 'location-points',
        data: locations.filter((location) => pointFeatures.some((feature) => feature.id === location.id)),
        pickable: true,
        radiusUnits: 'meters',
        radiusMinPixels: 6,
        getRadius: 80,
        stroked: true,
        lineWidthMinPixels: 1,
        getPosition: (location) => [location.longitude, location.latitude],
        // Highlight selected location with orange color; default to teal
        getFillColor: (location) => (location.id === selectedLocationId ? [234, 88, 12, 220] : [15, 118, 110, 210]),
        getLineColor: [255, 255, 255, 220],
        onClick: (info: PickingInfo<LocationRecord>) => {
          onSelectLocation(info.object?.id ?? null);
        },
        onHover: (info: PickingInfo<LocationRecord>) => {
          updateHoveredLocation(info.object?.id ?? null, info.x ?? 0, info.y ?? 0);
        },
      }),
    ];
  }, [featureCollection, locations, onSelectLocation, selectedLocationId]);

  /**
   * Render map container with overlays.
   * 
   * Structure:
   * 1. DeckGL + Map: base tile layer and location layers
   * 2. Tooltip: shows on hover, positioned near cursor
   * 3. Overlay: summary text ("N places found")
   * 4. Selected card: detail view for clicked location
   */
  return (
    <section className="map-panel">
      <DeckGL
        viewState={viewState}
        controller
        layers={layers}
        onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as MapViewState)}
      >
        <Map
          reuseMaps
          mapStyle={MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>

      {/* Hover tooltip: shows location details near cursor */}
      {hoveredLocation ? (
        <div
          className="map-panel__tooltip"
          style={{
            left: `${Math.min(hoveredLocation.x + 12, 320)}px`,
            top: `${Math.max(hoveredLocation.y - 12, 12)}px`,
          }}
        >
          <p className="eyebrow">Hover details</p>
          <h3>{hoveredLocation.location.name}</h3>
          <p>{hoveredLocation.location.displayName}</p>
          <p>{hoveredLocation.location.category}</p>
        </div>
      ) : null}

      {/* Summary overlay: result count and selected location name */}
      <div className="map-panel__overlay">
        <p className="eyebrow">Map output</p>
        <h2>{locations.length > 0 ? `${locations.length} places found` : 'Awaiting a search'}</h2>
        <p>
          {selectedLocation
            ? selectedLocation.displayName
            : 'Ask for a place, category, or neighborhood and the map will update here.'}
        </p>
      </div>

      {/* Selected location detail card: shown when user clicks a location */}
      {selectedLocation ? (
        <aside className="map-panel__card">
          <p className="eyebrow">Selected location</p>
          <h3>{selectedLocation.name}</h3>
          <p>{selectedLocation.displayName}</p>
          <p>{selectedLocation.category}</p>
        </aside>
      ) : null}
    </section>
  );
}
