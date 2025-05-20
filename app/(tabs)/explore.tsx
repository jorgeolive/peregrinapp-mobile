import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform, Text, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapView,
  MapViewRef,
  UserLocation,
  Camera,
  UserTrackingMode
} from "@maplibre/maplibre-react-native";
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
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { getUserDetails } from '../services/userService';
import { UserDetailsModal } from '../components/UserDetailsModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSocket } from '../context/SocketContext';
import { OtherUsersProvider } from '../context/OtherUsersContext';
import OtherUsersContainer from '../components/OtherUsersContainer';
import { LayerSelector, LayerVisibility } from '../components/LayerSelector';

// Define the user's hardcoded position
const HARDCODED_POSITION = {
  longitude: -8.544844,
  latitude: 42.880447
};

export default function ExploreScreen() {
  // Add render counter for debugging
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    // Only log every 10th render to reduce noise
    if (renderCount.current === 1 || renderCount.current % 10 === 0) {
      console.log(`ExploreScreen render #${renderCount.current}`);
    }
  });
  
  const router = useRouter();
  
  const { user } = useAuth();
  const { isConnected: isConnectedToSocket } = useSocket();
  const [selectedAlbergue, setSelectedAlbergue] = useState<AlbergueFeature | null>(null);
  const [albergueDetails, setAlbergueDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapViewRef>(null);
  const [stageDetails, setStageDetails] = useState<StageDetails | null>(null);
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [isStageLoading, setIsStageLoading] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state to track current zoom level
  const [currentZoomLevel, setCurrentZoomLevel] = useState(6);
  
  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    caminoNorte: true,
    albergues: true,
  });
  
  // Function to toggle layer visibility
  const handleToggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);
  
  // User details modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<{
    name: string;
    bio: string;
    enableDms: boolean;
  } | null>(null);
  
  // Use actual location or fallback to hardcoded position
  const { userLocation: actualLocation, getCurrentLocation, startLocationWatcher } = useLocation();
  
  // Memoize the userLocation to prevent unnecessary re-renders
  const userLocation = useMemo(() => {
    return actualLocation || HARDCODED_POSITION;
  }, [actualLocation?.latitude, actualLocation?.longitude]);
  
  // Track if location updates have been initialized
  const locationUpdatesInitialized = useRef(false);
  // Track if location watcher has been started
  const locationWatcherStarted = useRef(false);
  
  // Add useEffect to start location updates when the map loads
  useEffect(() => {
    // Only start location updates if user is logged in and socket is connected
    // and we haven't already initialized updates
    if (user && isConnectedToSocket && !locationUpdatesInitialized.current) {
      locationUpdatesInitialized.current = true;
      
      socketService.setPositionFunction(getCurrentLocation);
      
      socketService.getLocationSharingPreference().then(sharingEnabled => {
        if (sharingEnabled) {
          socketService.startLocationUpdates(getCurrentLocation);
        }
      });
    }
  }, [user, isConnectedToSocket]); 

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

  // Handle user marker click
  const handleUserPress = async (userId: string) => {
    // Prevent camera updates when pressing user markers
    setFollowUserLocation(false);
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }
    
    console.log(`[ExploreScreen] User marker clicked for userId: ${userId}`);
    
    setSelectedUserId(userId);
    setIsUserDetailsLoading(true);
    setUserDetailsError(null);
    setUserDetails(null);
    
    try {
      console.log(`[ExploreScreen] Fetching user details for userId: ${userId}`);
      const response = await getUserDetails(userId);
      console.log(`[ExploreScreen] User details response:`, JSON.stringify(response));
      
      if (response.success && response.user) {
        console.log(`[ExploreScreen] Successfully fetched user details for: ${response.user.name}`);
        setUserDetails({
          name: response.user.name,
          bio: response.user.bio,
          enableDms: response.user.enableDms
        });
      } else {
        console.error(`[ExploreScreen] Failed to fetch user details: ${response.message}`);
        setUserDetailsError(response.message || 'Failed to load user details');
      }
    } catch (error) {
      console.error('[ExploreScreen] Error in handleUserPress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ExploreScreen] Error details: ${errorMessage}`);
      setUserDetailsError('Network error loading user details');
    } finally {
      setIsUserDetailsLoading(false);
    }
  };
  
  // Close user details modal
  const handleCloseUserModal = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setUserDetailsError(null);
  };
 
  // Add useEffect to start location watcher on mount
  useEffect(() => {
    if (user && !locationWatcherStarted.current) {
      startLocationWatcher().then(success => {
        locationWatcherStarted.current = success;
      });
    }
    
    return () => {
      //console.log('[ExploreScreen] Cleaning up');
    };
  }, [user, startLocationWatcher]);
  
  const centerOnUserLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      if (mapRef.current) {

        setCurrentZoomLevel(15);
        setFollowUserLocation(true);
      }
      
      followTimeoutRef.current = setTimeout(() => {
        setFollowUserLocation(false);
        followTimeoutRef.current = null;
      }, 30000);
    }
  }, [userLocation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (followTimeoutRef.current) {
        clearTimeout(followTimeoutRef.current);
      }
    };
  }, []);

  // Add a reference to track the screen's visibility
  const isScreenFocused = useRef(false);
  
  // Use useFocusEffect to track screen focus state for map performance
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      console.log('[ExploreScreen] Screen focused');
      
      return () => {
        isScreenFocused.current = false;
        console.log('[ExploreScreen] Screen unfocused');
      };
    }, [])
  );

  return (
    <OtherUsersProvider>
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
              zoomLevel={currentZoomLevel}
              centerCoordinate={[userLocation.longitude, userLocation.latitude]}
              followUserLocation={followUserLocation}
              followUserMode={UserTrackingMode.Follow}
              followZoomLevel={currentZoomLevel}
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
            userLocation={userLocation}
            layerVisibility={layerVisibility}
          />
          
          {/* Use the container component to prevent MapView re-renders */}
          <OtherUsersContainer onUserPress={handleUserPress} />
        </MapView>
        
        <LayerSelector 
          visibility={layerVisibility}
          onToggleLayer={handleToggleLayer}
        />
        
        <View style={styles.buttonContainer}>
          <LocationButton onPress={centerOnUserLocation} />
        </View>
        
        {isConnectedToSocket && (
          <View style={styles.socketStatusContainer}>
            <View style={styles.socketStatusDot} />
            <Text style={styles.socketStatusText}>
              Connected
            </Text>
          </View>
        )}
        
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
          onClose={() => {
            setIsStageModalVisible(false);
            setStageDetails(null);
          }}
        />
        <UserDetailsModal
          visible={!!selectedUserId}
          userId={selectedUserId || undefined}
          username={userDetails?.name}
          userBio={userDetails?.bio}
          enableDms={userDetails?.enableDms}
          loading={isUserDetailsLoading}
          error={userDetailsError || undefined}
          onClose={handleCloseUserModal}
          onStartChat={(userId, name) => {
            console.log(`[ExploreScreen] Starting chat with user ${name} (${userId})`);
            handleCloseUserModal();
            
            // Navigate to the conversation screen
            router.push({
              pathname: "/conversation/[id]",
              params: { id: userId, name }
            });
          }}
        />
      </SafeAreaView>
    </OtherUsersProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  socketStatusContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  socketStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  socketStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
