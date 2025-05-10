import { StyleSheet, View, Platform, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapView,
  MapViewRef,
  UserLocation,
  Camera,
  UserTrackingMode
} from "@maplibre/maplibre-react-native";
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { getUserDetails } from '../services/userService';
import { UserDetailsModal } from '../components/UserDetailsModal';

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
  const [otherUsers, setOtherUsers] = useState<{
    id: string;
    name: string;
    longitude: number;
    latitude: number;
    color: string;
  }[]>([]);
  const [isConnectedToSocket, setIsConnectedToSocket] = useState(false);
  
  // Add state to track current zoom level
  const [currentZoomLevel, setCurrentZoomLevel] = useState(6);
  
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
  // Track if test user has been added
  const testUserAdded = useRef(false);
  // Track if location watcher has been started
  const locationWatcherStarted = useRef(false);
  
  // Initialize socket and listen for user updates
  useEffect(() => {
    console.log('Socket initialization useEffect running, user:', user?.id);
    
    if (user) {
      // Initialize socket connection
      console.log('Attempting to initialize socket connection');
      socketService.init().then(() => {
        setIsConnectedToSocket(true);
        console.log('Socket connected in explore screen');
      }).catch(error => {
        console.error('Socket connection error:', error);
        setIsConnectedToSocket(false);
      });
      
      // Set up callback for user updates from socket
      console.log('Setting up socket.setOnUsersUpdate callback');
      socketService.setOnUsersUpdate((users: UserData[]) => {
        console.log('Socket users_update event received with users:', users.length);
        
        // Debug raw user data
        users.forEach(u => {
          console.log(`Raw user data - id: ${u.id}, name: ${u.name}, location:`, 
            u.location ? `long: ${u.location.longitude} (${typeof u.location.longitude}), lat: ${u.location.latitude} (${typeof u.location.latitude})` : 'null');
            
          // Create a test user at the exact same coordinates as the socket user
          if (u.location) {
            const testUserId = `test-clone-${u.id}`;
            console.log(`Creating test clone user ${testUserId} at exact same coordinates`);
            
            const testClone = {
              id: testUserId,
              name: `Clone of ${u.name}`,
              longitude: u.location.longitude,
              latitude: u.location.latitude,
              color: '255, 0, 0' // Red color
            };
            
            // Update otherUsers with this clone
            setOtherUsers(prev => {
              if (!prev.find(pu => pu.id === testUserId)) {
                return [...prev, testClone];
              }
              return prev;
            });
          }
        });
        
        // Transform users from socket to the format needed by MapLayers with proper coordinate handling
        const transformedUsers = users
          .filter(u => u.id !== user.id && u.location) // Filter out current user and users without location
          .map(u => {
            // Create a proper user object with correct types
            const otherUser: {
              id: string;
              name: string;
              longitude: number;
              latitude: number;
              color: string;
            } = {
              id: String(u.id),
              name: u.name,
              // Ensure coordinates are properly converted to numbers
              longitude: parseFloat(String(u.location?.longitude)),
              latitude: parseFloat(String(u.location?.latitude)),
              // Ensure color is always a string
              color: '255, 87, 34' // Use a default color for all users
            };
            
            console.log(`Transformed user ${otherUser.name}: longitude=${otherUser.longitude}, latitude=${otherUser.latitude}`);
            return otherUser;
          });
        
        console.log('Setting otherUsers with:', JSON.stringify(transformedUsers));
        
        // Only update if we have users, prevent setting an empty array
        if (transformedUsers.length > 0) {
          setOtherUsers(prev => {
            // Combine transformed users with existing test user
            const existingTestUser = prev.find(u => u.id === 'test-user-static');
            const combinedUsers = [...transformedUsers];
            
            if (existingTestUser) {
              combinedUsers.push(existingTestUser);
            }
            
            console.log('Combined users array:', JSON.stringify(combinedUsers));
            return combinedUsers;
          });
        } else {
          console.log('Not updating otherUsers because transformedUsers is empty');
        }
      });
    }
    
    return () => {
      // Clean up socket connection when component unmounts
      socketService.disconnect();
    };
  }, [user]);
  
  // Add a new useEffect to start location updates when the map loads
  useEffect(() => {
    // Only start location updates if user is logged in and socket is connected
    // and we haven't already initialized updates
    if (user && isConnectedToSocket && !locationUpdatesInitialized.current) {
      console.log('[ExploreScreen] Setting up location updates for the map');
      locationUpdatesInitialized.current = true;
      
      // Make sure the location function is available
      socketService.setPositionFunction(getCurrentLocation);
      
      // Check if location sharing is already enabled
      socketService.getLocationSharingPreference().then(sharingEnabled => {
        if (sharingEnabled) {
          console.log('[ExploreScreen] Location sharing is enabled, starting updates');
          socketService.startLocationUpdates(getCurrentLocation);
        } else {
          console.log('[ExploreScreen] Location sharing is disabled, not starting updates');
        }
      });
    }
  }, [user, isConnectedToSocket]); // Removed getCurrentLocation from dependencies
  
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

  // Handle user marker click
  const handleUserPress = async (userId: string) => {
    // Prevent camera updates when pressing user markers
    setFollowUserLocation(false);
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }
    
    // Find the user in our local state to get their name
    const clickedUser = otherUsers.find(u => u.id === userId);
    console.log(`[ExploreScreen] User marker clicked for userId: ${userId}, name: ${clickedUser?.name || 'unknown'}`);
    
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
  
  // Handle send DM action
  const handleSendDM = () => {
    // TODO: Implement DM functionality or navigation to DM screen
    console.log(`Send DM to user ${selectedUserId}`);
    handleCloseUserModal();
    // Navigate to DM screen if needed
  };

  // Add useEffect to start location watcher on mount
  useEffect(() => {
    if (user && !locationWatcherStarted.current) {
      console.log('[ExploreScreen] Starting location watcher on component mount');
      startLocationWatcher().then(success => {
        locationWatcherStarted.current = success;
        console.log(`[ExploreScreen] Location watcher started: ${success}`);
      });
    }
    
    return () => {
      console.log('[ExploreScreen] Cleaning up');
    };
  }, [user, startLocationWatcher]);
  
  // Modify the centerOnUserLocation function to be memoized
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
  }, []); // Remove getCurrentLocation dependency

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

  // Debug otherUsers state - only log when there's actually a change
  useEffect(() => {
    if (renderCount.current > 2) { // Skip initial renders
      console.log('otherUsers state updated:', JSON.stringify(showOtherUsers ? otherUsers : []));
    }
  }, [otherUsers.length]); // Only react to length changes, not every detail

  // Create a static test user that will always be visible
  useEffect(() => {
    if (userLocation && !testUserAdded.current) {
      console.log('Adding static test user');
      testUserAdded.current = true;
      
      // Log test user details in great detail
      const testLongitude = userLocation.longitude + 0.0008;
      const testLatitude = userLocation.latitude + 0.0008;
      
      console.log(`Creating test user at: long=${testLongitude} (${typeof testLongitude}), lat=${testLatitude} (${typeof testLatitude})`);
      
      // Define test user with proper type matching other transformed users
      const testUser: {
        id: string;
        name: string;
        longitude: number;
        latitude: number;
        color: string;
      } = {
        id: 'test-user-static',
        name: 'Static Test User',
        longitude: testLongitude,
        latitude: testLatitude,
        color: '0, 0, 255' // Blue color
      };
      
      // Add test user without removing any existing users from socket
      setOtherUsers(current => {
        // Only add if not already present
        if (!current.find(u => u.id === testUser.id)) {
          return [...current, testUser];
        }
        return current;
      });
    }
  }, []); // Empty dependency array to run only once
  
  // Check distance between current user and other users - optimize to prevent excessive logging
  const calculateDistancesRef = useRef(0);
  useEffect(() => {
    // Only calculate distances occasionally to avoid performance issues
    if (userLocation && otherUsers.length > 0 && calculateDistancesRef.current % 10 === 0) {
      console.log('Calculating distances to other users');
      
      otherUsers.forEach(other => {
        // Simple approximate distance calculation
        const latDiff = Math.abs(userLocation.latitude - other.latitude);
        const lonDiff = Math.abs(userLocation.longitude - other.longitude);
        
        console.log(`User ${other.name} coordinates: ${other.longitude}, ${other.latitude}`);
        console.log(`Distance from current user (approx degrees): lat: ${latDiff.toFixed(6)}, lon: ${lonDiff.toFixed(6)}`);
        console.log(`1 degree latitude ≈ 111 km, so approx distance: ${(latDiff * 111).toFixed(2)} km`);
      });
    }
    calculateDistancesRef.current += 1;
  }, [userLocation, otherUsers.length]); // Only react to significant changes

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
        onRegionDidChange={(e) => {
          // Track zoom level changes when the user interacts with the map
          if (e.properties.zoomLevel) {
            setCurrentZoomLevel(e.properties.zoomLevel);
            console.log(`[ExploreScreen] Map zoom level changed to: ${e.properties.zoomLevel}`);
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
          onUserPress={handleUserPress}
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
      <UserDetailsModal
        visible={!!selectedUserId}
        userId={selectedUserId || undefined}
        username={userDetails?.name}
        userBio={userDetails?.bio}
        enableDms={userDetails?.enableDms}
        loading={isUserDetailsLoading}
        error={userDetailsError || undefined}
        onClose={handleCloseUserModal}
        onSendDM={handleSendDM}
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
