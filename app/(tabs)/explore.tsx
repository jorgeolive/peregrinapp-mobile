import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapView,
  MapViewRef,
  UserLocation,
  Camera,
  UserTrackingMode
} from "@maplibre/maplibre-react-native";
import { useState, useRef, useCallback, useEffect } from 'react';
import { AlbergueModal } from '../components/AlbergueModal';
import { AlbergueFeature } from '../types/map';
import { fetchAlbergueDetails } from '../services/albergueService';
import { StageDetails } from '../types/stage';
import { fetchStageDetails } from '../services/stageService';
import { StageModal } from '../components/StageModal';
import { useLocation } from '../hooks/useLocation';
import { MapLayers } from '../components/MapLayers';
import { LocationButton } from '../components/LocationButton';
import { mapStyle } from '../components/MapStyles';

export default function TabTwoScreen() {
  const [selectedAlbergue, setSelectedAlbergue] = useState<AlbergueFeature | null>(null);
  const [albergueDetails, setAlbergueDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapViewRef>(null);
  const [stageDetails, setStageDetails] = useState<StageDetails | null>(null);
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [isStageLoading, setIsStageLoading] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { userLocation, getCurrentLocation } = useLocation();

  const handleAlberguePress = async (event: any) => {
    // Prevent camera updates when pressing albergues
    setFollowUserLocation(false);
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }

    const feature = event.features[0] as AlbergueFeature;
    if (feature) {
      setSelectedAlbergue(feature);
      try {
        setIsLoading(true);
        const details = await fetchAlbergueDetails(feature.id);
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
    // Prevent camera updates when pressing stages
    setFollowUserLocation(false);
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }

    const feature = event.features[0];
    const stageId = feature.properties.id;
    
    setIsStageModalVisible(true);
    setIsStageLoading(true);
    try {
      const details = await fetchStageDetails(stageId);
      setStageDetails(details);
    } catch (error) {
      console.error('Error fetching stage details:', error);
      setStageDetails(null);
    } finally {
      setIsStageLoading(false);
    }
  };

  const centerOnUserLocation = useCallback(async () => {
    // Clear any existing timeout
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }

    // Reset follow mode
    setFollowUserLocation(false);

    const location = await getCurrentLocation();
    if (location) {
      // Set follow mode
      setFollowUserLocation(true);

      // Set a new timeout to disable follow mode
      followTimeoutRef.current = setTimeout(() => {
        setFollowUserLocation(false);
        followTimeoutRef.current = null;
      }, 2000);
    }
  }, [getCurrentLocation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={JSON.stringify(mapStyle)}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        onPress={() => {
          // Disable follow on any map press
          setFollowUserLocation(false);
          if (followTimeoutRef.current) {
            clearTimeout(followTimeoutRef.current);
            followTimeoutRef.current = null;
          }
        }}
      >
        {userLocation && followUserLocation && (
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
          androidRenderMode="compass"
          renderMode={Platform.OS === 'android' ? 'native' : 'normal'} 
        />
        
        <MapLayers
          onAlberguePress={handleAlberguePress}
          onStagePress={handleStagePress}
        />
      </MapView>
      
      <LocationButton onPress={centerOnUserLocation} />
      
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
  map: {
    flex: 1,
  },
});
