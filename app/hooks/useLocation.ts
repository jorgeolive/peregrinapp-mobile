import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const useLocation = () => {
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<null | {
    longitude: number;
    latitude: number;
  }>(null);

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
        try {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      requestLocationPermission();
      return null;
    }
    
    try {
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

  useEffect(() => {
    requestLocationPermission();
  }, []);

  return {
    locationPermission,
    userLocation,
    getCurrentLocation
  };
}; 