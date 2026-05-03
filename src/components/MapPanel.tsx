import { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { StyleSpecification } from 'maplibre-gl';
import Map from 'react-map-gl/maplibre';
import type { GeoJsonFeature, GeoJsonFeatureCollection, LocationRecord, MapViewState } from '../types';
import { calculateViewState } from '../lib/geo';

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

interface MapPanelProps {
  locations: LocationRecord[];
  featureCollection: GeoJsonFeatureCollection;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
}

function isPointFeature(feature: GeoJsonFeature): boolean {
  return feature.geometry.type === 'Point';
}

export function MapPanel({
  locations,
  featureCollection,
  selectedLocationId,
  onSelectLocation,
}: MapPanelProps) {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 103.8198,
    latitude: 1.3521,
    zoom: 11,
    bearing: 0,
    pitch: 0,
  });
  const [hoveredLocation, setHoveredLocation] = useState<{
    x: number;
    y: number;
    location: LocationRecord;
  } | null>(null);

  useEffect(() => {
    setViewState((current) => ({
      ...current,
      ...calculateViewState(locations),
    }));
  }, [locations]);

  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;

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

      <div className="map-panel__overlay">
        <p className="eyebrow">Map output</p>
        <h2>{locations.length > 0 ? `${locations.length} places found` : 'Awaiting a search'}</h2>
        <p>
          {selectedLocation
            ? selectedLocation.displayName
            : 'Ask for a place, category, or neighborhood and the map will update here.'}
        </p>
      </div>

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
