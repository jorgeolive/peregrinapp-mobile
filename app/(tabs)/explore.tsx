import { StyleSheet, View, Text, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CircleLayer,
  MapView,
  ShapeSource,
  MapViewRef,
} from "@maplibre/maplibre-react-native";
import { useState, useRef } from 'react';
import { AlbergueModal } from '../components/AlbergueModal';
import { AlbergueFeature, MapStyle } from '../types/map';
import { fetchAlbergueDetails } from '../services/albergueService';

export default function TabTwoScreen() {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedAlbergue, setSelectedAlbergue] = useState<AlbergueFeature | null>(null);
  const [albergueDetails, setAlbergueDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapViewRef>(null);

  const handleAlberguePress = async (event: any) => {
    console.log('Albergue press event:', event);
    const feature = event.features[0] as AlbergueFeature;
    console.log('Selected feature:', feature);
    if (feature) {
      setSelectedAlbergue(feature);
      try {
        setIsLoading(true);
        console.log('Fetching details for albergue ID:', feature.id);
        const details = await fetchAlbergueDetails(feature.id);
        console.log('Fetched albergue details:', details);
        setAlbergueDetails(details);
      } catch (error) {
        console.error('Error handling albergue press:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedAlbergue(null);
    setAlbergueDetails(null);
  };

  const mapStyle: MapStyle = {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      'es-map': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:es_map&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      },
      'poblaciones': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:poblaciones&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      },
      'camino-norte': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      },
      'albergues': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte_albergues&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      },
      'carretera-sec': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:carretera_sec&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      },
      'carretera-ppal': {
        type: 'vector',
        tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:carretera_ppal&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
        tms: true
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#FFF9E6'  // Light beige color that matches your map style
        }
      },
      {
        id: 'es-map-fill',
        type: 'fill',
        source: 'es-map',
        'source-layer': 'es_map',
        paint: {
          'fill-color': '#FFF9E6',
          'fill-opacity': 0.9,
          'fill-outline-color': '#FFE6B3'
        }
      },
      {
        id: 'es-map-line',
        type: 'line',
        source: 'es-map',
        'source-layer': 'es_map',
        paint: {
          'line-color': '#FFE6B3',
          'line-width': 1,
          'line-opacity': 0.7
        }
      },
      {
        id: 'camino-norte-line',
        type: 'line',
        source: 'camino-norte',
        'source-layer': 'camino_norte',
        minzoom: 8,
        paint: {
          'line-color': '#FF0000',
          'line-width': 3,
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ]
        }
      },
      {
        id: 'poblaciones-points',
        type: 'circle',
        source: 'poblaciones',
        'source-layer': 'poblaciones',
        minzoom: 10,
        paint: {
          'circle-radius': 4,
          'circle-color': '#FF5722',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            9, 1
          ],
          'circle-stroke-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            9, 1
          ]
        }
      },
      {
        id: 'poblaciones-labels',
        type: 'symbol',
        source: 'poblaciones',
        'source-layer': 'poblaciones',
        minzoom: 10,
        layout: {
          'text-field': ['get', 'etiqueta'],
          'text-anchor': 'left',
          'text-offset': [0.5, 0],
          'text-size': 12,
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 0,
            9, 1
          ]
        }
      },
      {
        id: 'albergues-points',
        type: 'circle',
        source: 'albergues',
        'source-layer': 'camino_norte_albergues',
        minzoom: 8,
        paint: {
          'circle-radius': 6,
          'circle-color': '#4CAF50',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ],
          'circle-stroke-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ]
        }
      },
      {
        id: 'albergues-labels',
        type: 'symbol',
        source: 'albergues',
        'source-layer': 'camino_norte_albergues',
        minzoom: 10,
        layout: {
          'text-field': ['get', 'name'],
          'text-anchor': 'left',
          'text-offset': [0.7, 0],
          'text-size': 14,
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'text-color': '#1B5E20',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ]
        }
      },
      {
        id: 'carretera-sec-line',
        type: 'line',
        source: 'carretera-sec',
        'source-layer': 'carretera_sec',
        minzoom: 8,
        paint: {
          'line-color': '#666666',
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2]
        }
      },
      {
        id: 'carretera-ppal-line',
        type: 'line',
        source: 'carretera-ppal',
        'source-layer': 'carretera_ppal',
        minzoom: 8,
        paint: {
          'line-color': '#333333',
          'line-width': 3,
          'line-opacity': 0.8
        }
      }
    ],
    center: [-8.5463, 42.8805],
    zoom: 9,
    minzoom: 9,
    maxzoom: 18,
    maxBounds: [
      [-9.4, 36.0],
      [4.4, 43.8]
    ]
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonsContainer}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>Share my position</Text>
          <Switch
            value={isSharing}
            onValueChange={(value) => {
              console.log('Position sharing toggled:', value);
              setIsSharing(value);
            }}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isSharing ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={JSON.stringify(mapStyle)}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        onDidFinishLoadingMap={() => {
          console.log('Map finished loading');
        }}
        onDidFailLoadingMap={() => {
          console.error('Map failed to load');
        }}
      >
        <ShapeSource id="shape" shape={{ type: "Point", coordinates: [-8.5463, 42.8805] }}>
          <CircleLayer
            id="circle"
            style={{ circleRadius: 8, circleColor: "red" }}
          />
        </ShapeSource>
        <ShapeSource
          id="albergues"
          url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte_albergues&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
          onPress={handleAlberguePress}
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
      </MapView>
      <AlbergueModal
        selectedAlbergue={selectedAlbergue}
        albergueDetails={albergueDetails}
        isLoading={isLoading}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonsContainer: {
    height: 60,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
});
