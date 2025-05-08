import React from 'react';
import { CircleLayer, LineLayer, ShapeSource, SymbolLayer } from "@maplibre/maplibre-react-native";
import { AlbergueFeature } from '../types/map';

interface OtherUser {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  color?: string;
}

interface MapLayersProps {
  onAlberguePress: (event: any) => void;
  onStagePress: (event: any) => void;
  userLocation?: { longitude: number; latitude: number } | null;
  showCustomUserMarker?: boolean;
  otherUsers?: OtherUser[];
}

export const MapLayers: React.FC<MapLayersProps> = ({ 
  onAlberguePress, 
  onStagePress,
  userLocation,
  showCustomUserMarker = false,
  otherUsers = []
}) => {
  return (
    <>
      {/* Other users */}
      {otherUsers.map(user => (
        <ShapeSource 
          key={`other-user-${user.id}`}
          id={`other-user-${user.id}`}
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [user.longitude, user.latitude]
            },
            properties: {
              name: user.name
            }
          }}
        >
          {/* Outer ring */}
          <CircleLayer
            id={`other-user-halo-${user.id}`}
            style={{
              circleRadius: 14,
              circleColor: `rgba(${user.color || '255, 87, 34'}, 0.2)`,
              circleStrokeWidth: 1,
              circleStrokeColor: `rgba(${user.color || '255, 87, 34'}, 0.4)`
            }}
          />
          
          {/* Inner circle */}
          <CircleLayer
            id={`other-user-circle-${user.id}`}
            style={{
              circleRadius: 7,
              circleColor: `rgb(${user.color || '255, 87, 34'})`,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff'
            }}
          />
          
          {/* User label */}
          <SymbolLayer
            id={`other-user-label-${user.id}`}
            style={{
              textField: ['get', 'name'],
              textSize: 12,
              textOffset: [0, 2.0],
              textAnchor: 'top',
              textColor: '#000',
              textHaloColor: '#fff',
              textHaloWidth: 1
            }}
          />
        </ShapeSource>
      ))}
      
      {/* Custom user location marker */}
      {showCustomUserMarker && userLocation && (
        <ShapeSource 
          id="custom-user-location"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [userLocation.longitude, userLocation.latitude]
            },
            properties: {
              name: 'You'
            }
          }}
        >
          {/* Outer ring - light blue halo */}
          <CircleLayer
            id="custom-user-circle-halo"
            style={{
              circleRadius: 15,
              circleColor: 'rgba(25, 118, 210, 0.2)',
              circleStrokeWidth: 1,
              circleStrokeColor: 'rgba(25, 118, 210, 0.4)'
            }}
          />
          
          {/* Inner circle - blue dot */}
          <CircleLayer
            id="custom-user-circle"
            style={{
              circleRadius: 8,
              circleColor: '#1976D2',
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff'
            }}
          />
          
          {/* User label */}
          <SymbolLayer
            id="custom-user-label"
            style={{
              textField: ['get', 'name'],
              textSize: 12,
              textOffset: [0, 2.2],
              textAnchor: 'top',
              textColor: '#000',
              textHaloColor: '#fff',
              textHaloWidth: 1
            }}
          />
        </ShapeSource>
      )}
      
      <ShapeSource
        id="albergues"
        url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte_albergues&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
        onPress={onAlberguePress}
      >
        <CircleLayer
          id="albergues-points"
          style={{
            circleRadius: 6,
            circleColor: '#4CAF50',
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
            circleOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 0,
              6, 1
            ],
            circleStrokeOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 0,
              6, 1
            ]
          }}
        />
      </ShapeSource>
      
      <ShapeSource
        id="camino-norte"
        url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
        onPress={onStagePress}
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
            lineOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 0,
              6, 1
            ]
          }}
        />
      </ShapeSource>
    </>
  );
}; 