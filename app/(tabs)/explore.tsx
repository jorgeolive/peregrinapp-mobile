import { StyleSheet, View, Text, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CircleLayer,
  MapView,
  ShapeSource,
  MapViewRef,
  LineLayer,
  UserLocation,
  Camera,
  UserTrackingMode
} from "@maplibre/maplibre-react-native";
import { useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AlbergueModal } from '../components/AlbergueModal';
import { AlbergueFeature, MapStyle } from '../types/map';
import { fetchAlbergueDetails } from '../services/albergueService';
import { StageDetails } from '../types/stage';
import { fetchStageDetails } from '../services/stageService';
import { StageModal } from '../components/StageModal';

export default function TabTwoScreen() {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedAlbergue, setSelectedAlbergue] = useState<AlbergueFeature | null>(null);
  const [albergueDetails, setAlbergueDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapViewRef>(null);
  const [stageDetails, setStageDetails] = useState<StageDetails | null>(null);
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [isStageLoading, setIsStageLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<null | {
    longitude: number;
    latitude: number;
  }>(null);
  const [followUserLocation, setFollowUserLocation] = useState(false);

  // Request location permissions when the component mounts
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to show your position on the map.'
        );
      } else {
        // Get initial location if permission is granted
        try {
          console.log('Getting initial location...');
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          console.log('Location data:', location);
          console.log('Coordinates:', {
            longitude: location.coords.longitude,
            latitude: location.coords.latitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed
          });
          setUserLocation({
            longitude: location.coords.longitude,
            latitude: location.coords.latitude
          });
        } catch (error) {
          console.error('Error getting initial location:', error);
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  // Function to center the map on user location
  const centerOnUserLocation = async () => {
    if (!locationPermission) {
      console.log('No location permission, requesting permission...');
      requestLocationPermission();
      return;
    }
    
    console.log('Centering on user location...');
    try {
      console.log('Getting current position...');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log('Current position retrieved:', {
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
        accuracy: location.coords.accuracy
      });
      
      setUserLocation({
        longitude: location.coords.longitude,
        latitude: location.coords.latitude
      });
      
      // Enable follow mode temporarily
      console.log('Enabling follow mode...');
      setFollowUserLocation(true);
      
      // After a short delay, disable follow mode to allow manual panning
      setTimeout(() => {
        console.log('Disabling follow mode...');
        setFollowUserLocation(false);
      }, 2000);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not determine your location. Please check your device settings.');
    }
  };

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

  const handleStagePress = async (event: any) => {
    console.log('handleStagePress called');
    console.log('Stage press event:', event);
    const feature = event.features[0];
    console.log('Selected feature:', feature);
    const stageId = feature.properties.id;
    console.log('Stage ID:', stageId);
    
    console.log('Setting modal visible to true');
    setIsStageModalVisible(true);
    setIsStageLoading(true);
    try {
      const details = await fetchStageDetails(stageId);
      console.log('Fetched stage details:', details);
      setStageDetails(details);
    } catch (error) {
      console.error('Error fetching stage details:', error);
      setStageDetails(null);
    } finally {
      setIsStageLoading(false);
    }
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
          'background-color': '#E0F7FA'  // Light blue color
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
          'line-color': [
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
            '#888888' //default
          ],
          'line-width': 4,
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0,
            6, 1
          ]
        },
        onPress: handleStagePress
      },
      {
        id: 'camino-norte-labels',
        type: 'symbol',
        source: 'camino-norte',
        'source-layer': 'camino_norte',
        minzoom: 10,
        layout: {
          'text-field': ['get', 'etapa'],
          'symbol-placement': 'line',
          'text-size': 16,
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'text-color': '#1E88E5',
          'text-halo-color': '#fff',
          'text-halo-width': 2
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
        {userLocation && (
          <Camera
            zoomLevel={14}
            centerCoordinate={[userLocation.longitude, userLocation.latitude]}
            followUserLocation={followUserLocation}
            followUserMode={UserTrackingMode.Follow}
            followZoomLevel={14}
          />
        )}
        
        <UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          animated={true}
          renderMode={Platform.OS === 'android' ? 'native' : 'normal'} 
        />
        
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
        
        <ShapeSource
          id="camino-norte"
          url="http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}"
          onPress={handleStagePress}
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
                '#888888' //default
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
      </MapView>
      
      {/* Add the location button */}
      <TouchableOpacity style={styles.locationButton} onPress={centerOnUserLocation}>
        <MaterialIcons name="my-location" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <AlbergueModal
        selectedAlbergue={selectedAlbergue}
        albergueDetails={albergueDetails}
        isLoading={isLoading}
        onClose={handleCloseModal}
      />
      <StageModal
        visible={isStageModalVisible}
        stageDetails={stageDetails}
        isLoading={isStageLoading}
        onClose={() => setIsStageModalVisible(false)}
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
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
