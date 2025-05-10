import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocation = () => {
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<null | {
    longitude: number;
    latitude: number;
  }>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const isInitialized = useRef(false);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to show your position on the map.'
        );
        return false;
      } else {
        return true;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startLocationWatcher = async (force = false) => {
    try {
      // First check if user is logged in
      const token = await AsyncStorage.getItem('token');
      if (!token && !force) {
        console.log('[useLocation] Not starting location watcher - user not logged in');
        return false;
      }

      // Then check permissions
      if (!locationPermission) {
        const granted = await requestLocationPermission();
        if (!granted) return false;
      }
      
      // Clear any existing watcher
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
      
      // Set up location watcher with appropriate options
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update if user moves at least 5 meters
          timeInterval: 3000,  // Or at least every 3 seconds
        },
        (location) => {
          //console.log('[useLocation] Location update from watcher');
          const newLocation = {
            longitude: location.coords.longitude,
            latitude: location.coords.latitude
          };
          setUserLocation(newLocation);
        }
      );
      
      console.log('[useLocation] Location watcher started');
      isInitialized.current = true;
      return true;
    } catch (error) {
      console.error('Error starting location watcher:', error);
      return false;
    }
  };

  const stopLocationWatcher = () => {
    if (locationWatcher.current) {
      console.log('[useLocation] Stopping location watcher');
      locationWatcher.current.remove();
      locationWatcher.current = null;
      isInitialized.current = false;
    }
  };

  const getCurrentLocation = async () => {
    // Check if user is logged in
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('[useLocation] Not getting location - user not logged in');
      return null;
    }
    
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }
    
    try {
      // Even with a watcher, we can still force an immediate update
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newLocation = {
        longitude: location.coords.longitude,
        latitude: location.coords.latitude
      };
      setUserLocation(newLocation);
      return newLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not determine your location. Please check your device settings.');
      return null;
    }
  };

  // Do NOT automatically start watching on mount
  // Let the components decide when to start based on auth state
  useEffect(() => {
    // Only clean up watcher on unmount
    return () => {
      stopLocationWatcher();
    };
  }, []);

  return {
    locationPermission,
    userLocation,
    getCurrentLocation,
    startLocationWatcher,
    stopLocationWatcher,
    isInitialized: () => isInitialized.current
  };
}; 