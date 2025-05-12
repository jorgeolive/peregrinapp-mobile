import React, { useMemo, memo } from 'react';
import { CircleLayer, LineLayer, ShapeSource, SymbolLayer, RasterSource, RasterLayer } from "@maplibre/maplibre-react-native";
import { LayerVisibility } from './LayerSelector';

interface MapLayersProps {
  onAlberguePress: (event: any) => void;
  onStagePress: (event: any) => void;
  userLocation?: { longitude: number; latitude: number } | null;
  layerVisibility: LayerVisibility;
}

// Memoized static layer components
const AlberguesLayer = memo(({ 
  onAlberguePress, 
  visible 
}: { 
  onAlberguePress: (event: any) => void;
  visible: boolean;
}) => {
  return (
    <ShapeSource
      id="albergues"
      url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte_albergues&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
      onPress={visible ? onAlberguePress : undefined}
    >
      <CircleLayer
        id="albergues-points"
        style={{
          circleRadius: 6,
          circleColor: '#4CAF50',
          circleStrokeWidth: 2,
          circleStrokeColor: '#ffffff',
          circleOpacity: visible ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ] : 0,
          circleStrokeOpacity: visible ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ] : 0
        }}
      />
      <SymbolLayer
        id="albergues-labels"
        style={{
          textField: ['get', 'name'],
          textAnchor: 'left',
          textOffset: [0.7, 0],
          textSize: 14,
          textColor: '#1B5E20',
          textHaloColor: '#fff',
          textHaloWidth: 2,
          textOpacity: visible ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ] : 0
        }}
      />
    </ShapeSource>
  );
});

const CaminoNorteLayer = memo(({ 
  onStagePress, 
  visible 
}: { 
  onStagePress: (event: any) => void;
  visible: boolean;
}) => {
  return (
    <ShapeSource
      id="camino-norte"
      url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
      onPress={visible ? onStagePress : undefined}
      hitbox={{ width: 20, height: 20 }}
    >
      <LineLayer
        id="camino-norte-line"
        style={{
          lineColor: [
            'match',
            ['get', 'id_etapa'],
            '13a', '#e6194b',
            '11c', '#3cb44b',
            '08a', '#ffe119',
            '26b', '#4363d8',
            '11a', '#f58231',
            '01d', '#911eb4',
            '27a', '#46f0f0',
            '17a', '#f032e6',
            '18b', '#bcf60c',
            '01b', '#fabebe',
            '31a', '#008080',
            '04b', '#e6beff',
            '05a', '#9a6324',
            '12a', '#fffac8',
            '01c', '#800000',
            '14a', '#aaffc3',
            '24a', '#808000',
            '09a', '#ffd8b1',
            '22a', '#000075',
            '21a', '#808080',
            '03b', '#ffffff',
            '07a', '#000000',
            '10a', '#a9a9a9',
            '12b', '#b0e0e6',
            '18a', '#ffb347',
            '12c', '#c0c0c0',
            '31b', '#bada55',
            '23b', '#ff69b4',
            '11d', '#cd5c5c',
            '28a', '#40e0d0',
            '02a', '#ff6347',
            '03a', '#4682b4',
            '29a', '#daa520',
            '23a', '#7fffd4',
            '26a', '#dc143c',
            '04a', '#00ced1',
            '30a', '#ff00ff',
            '06a', '#1e90ff',
            '16a', '#deb887',
            '19a', '#00fa9a',
            '21b', '#b22222',
            '01e', '#adff2f',
            '20a', '#f0e68c',
            '11b', '#dda0dd',
            '15a', '#f5deb3',
            '14b', '#b0c4de',
            '25a', '#ffdead',
            '#888888'
          ],
          lineWidth: 4,
          lineOpacity: visible ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ] : 0
        }}
      />
      <SymbolLayer
        id="camino-norte-labels"
        style={{
          textField: ['get', 'etapa'],
          symbolPlacement: 'line',
          textSize: 16,
          textColor: '#1E88E5',
          textHaloColor: '#fff',
          textHaloWidth: 2,
          textOpacity: visible ? 1 : 0
        }}
      />
    </ShapeSource>
  );
});

// Memoized IGN base map layer
const IGNBaseLayer = memo(({ visible }: { visible: boolean }) => {
  return (
    <RasterSource
      id="ign-base-source"
      url="https://www.ign.es/wmts/ign-base?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=IGNBaseTodo-nofondo&STYLE=default&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png"
    >
      <RasterLayer
        id="ign-base-layer"
        style={{ rasterOpacity: visible ? 1 : 0 }}
      />
    </RasterSource>
  );
});

export const MapLayers: React.FC<MapLayersProps> = memo(({ 
  onAlberguePress, 
  onStagePress,
  userLocation,
  layerVisibility
}) => {
  const staticLayers = useMemo(() => (
    <>
      <IGNBaseLayer visible={layerVisibility.ignBase} />
      <AlberguesLayer 
        onAlberguePress={onAlberguePress} 
        visible={layerVisibility.albergues} 
      />
      <CaminoNorteLayer 
        onStagePress={onStagePress} 
        visible={layerVisibility.caminoNorte} 
      />
    </>
  ), [onAlberguePress, onStagePress, layerVisibility]);

  return (
    <>
      {staticLayers}
    </>
  );
}); 