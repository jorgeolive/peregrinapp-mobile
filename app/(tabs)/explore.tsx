import { StyleSheet, View, Platform, TouchableOpacity, Text } from 'react-native';
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
import socketService, { UserData } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

// Define the user's hardcoded position
const HARDCODED_POSITION = {
  longitude: -8.544844,
  latitude: 42.880447
};

// Define other users nearby (fallback when socket is not connected)
const NEARBY_USERS = [
  {
    id: '1',
    name: 'Maria',
    longitude: -8.543901,
    latitude: 42.879986,
    color: '233, 30, 99' // Pink
  },
  {
    id: '2',
    name: 'Carlos',
    longitude: -8.545823,
    latitude: 42.881234,
    color: '156, 39, 176' // Purple
  },
  {
    id: '3',
    name: 'John',
    longitude: -8.543256,
    latitude: 42.881798,
    color: '0, 150, 136' // Teal
  },
  {
    id: '4',
    name: 'Sofia',
    longitude: -8.546412,
    latitude: 42.879532,
    color: '255, 152, 0' // Orange
  },
  {
    id: '5',
    name: 'Ahmed',
    longitude: -8.544112,
    latitude: 42.882314,
    color: '121, 85, 72' // Brown
  }
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const [selectedAlbergue, setSelectedAlbergue] = useState<AlbergueFeature | null>(null);
  const [albergueDetails, setAlbergueDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<MapViewRef>(null);
  const [stageDetails, setStageDetails] = useState<StageDetails | null>(null);
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [isStageLoading, setIsStageLoading] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [useCustomMarker, setUseCustomMarker] = useState(false);
  const [showOtherUsers, setShowOtherUsers] = useState(true);
  const [otherUsers, setOtherUsers] = useState(NEARBY_USERS);
  const [isConnectedToSocket, setIsConnectedToSocket] = useState(false);
  
  // Use actual location or fallback to hardcoded position
  const { userLocation: actualLocation, getCurrentLocation } = useLocation();
  const userLocation = actualLocation || HARDCODED_POSITION;
  
  // Initialize socket and listen for user updates
  useEffect(() => {
    if (user) {
      // Initialize socket connection
      socketService.init().then(() => {
        setIsConnectedToSocket(true);
        console.log('Socket connected in explore screen');
      }).catch(error => {
        console.error('Socket connection error:', error);
        setIsConnectedToSocket(false);
      });
      
      // Set up callback for user updates from socket
      socketService.setOnUsersUpdate((users: UserData[]) => {
        // Transform users from socket to the format needed by MapLayers
        const transformedUsers = users
          .filter(u => u.id !== user.id && u.location) // Filter out current user and users without location
          .map(u => ({
            id: u.id,
            name: u.name,
            longitude: u.location?.longitude || 0,
            latitude: u.location?.latitude || 0,
            color: getRandomColor(u.id) // Assign a color based on user ID
          }));
        
        setOtherUsers(transformedUsers);
      });
    }
    
    return () => {
      // Clean up socket connection when component unmounts
      socketService.disconnect();
    };
  }, [user]);
  
  // Function to generate a consistent color for a user based on their ID
  const getRandomColor = (userId: string) => {
    // Simple hash function to generate a consistent color for a user ID
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Predefined colors
    const colors = [
      '233, 30, 99',   // Pink
      '156, 39, 176',  // Purple
      '0, 150, 136',   // Teal
      '255, 152, 0',   // Orange
      '121, 85, 72',   // Brown
      '63, 81, 181',   // Indigo
      '33, 150, 243',  // Blue
      '76, 175, 80',   // Green
      '255, 193, 7'    // Amber
    ];
    
    return colors[hash % colors.length];
  };

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
    } else {
      // Use hardcoded position if actual location is not available
      setFollowUserLocation(true);
      followTimeoutRef.current = setTimeout(() => {
        setFollowUserLocation(false);
        followTimeoutRef.current = null;
      }, 2000);
    }
  }, [getCurrentLocation]);

  // Toggle between custom and standard user marker
  const toggleUserMarker = () => {
    setUseCustomMarker(prev => !prev);
  };

  // Toggle showing other users
  const toggleOtherUsers = () => {
    setShowOtherUsers(prev => !prev);
  };

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
        
        {/* Only show built-in user location when not using custom marker */}
        {!useCustomMarker && (
          <UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            animated={true}
            androidRenderMode="compass"
            renderMode={Platform.OS === 'android' ? 'native' : 'normal'} 
          />
        )}
        
        <MapLayers
          onAlberguePress={handleAlberguePress}
          onStagePress={handleStagePress}
          userLocation={userLocation}
          showCustomUserMarker={useCustomMarker}
          otherUsers={showOtherUsers ? otherUsers : []}
        />
      </MapView>
      
      <View style={styles.buttonContainer}>
        <LocationButton onPress={centerOnUserLocation} />
        <TouchableOpacity 
          style={[styles.markerToggle, useCustomMarker ? styles.markerToggleActive : {}]}
          onPress={toggleUserMarker}
        >
          <Text style={styles.markerToggleText}>
            {useCustomMarker ? 'Custom' : 'Standard'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.markerToggle, showOtherUsers ? styles.otherUsersActive : {}]}
          onPress={toggleOtherUsers}
        >
          <Text style={styles.markerToggleText}>
            {showOtherUsers ? 'Hide' : 'Show'} Users
          </Text>
        </TouchableOpacity>
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
  buttonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  markerToggle: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    width: 48,
    height: 48,
  },
  markerToggleActive: {
    backgroundColor: '#1976D2',
  },
  otherUsersActive: {
    backgroundColor: '#FF5722',
  },
  markerToggleText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333',
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
