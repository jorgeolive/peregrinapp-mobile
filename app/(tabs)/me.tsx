import React from 'react';
import { StyleSheet, Text, TextInput, View, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/profileService';
import socketService from '../services/socketService';
import { useLocation } from '../hooks/useLocation';

export default function MeScreen() {
  const { user, login, logout } = useAuth();
  const [aboutMe, setAboutMe] = useState('');
  const [allowDirectMessages, setAllowDirectMessages] = useState(false);
  const [sharePosition, setSharePosition] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { getCurrentLocation } = useLocation();

  // Load initial settings from user object and AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      if (user) {
        setAboutMe(user.bio || '');
        setAllowDirectMessages(user.enableDms || false);
        
        // Get sharePosition from AsyncStorage instead of user object
        const storedSharePosition = await socketService.getLocationSharingPreference();
        setSharePosition(storedSharePosition);
      }
    };
    
    loadSettings();
  }, [user]);

  // Initialize socket connection when component mounts or when sharePosition changes
  useEffect(() => {
    // This effect now only needs to ensure the location function is passed to socketService
    if (user && sharePosition) {
      console.log('[MeScreen] User has location sharing enabled, ensuring socket is connected');
      // Check if socket is already initialized and authenticated before trying to restart
      if (!socketService.isSocketAuthenticated()) {
        console.log('[MeScreen] Socket not authenticated, initializing');
        socketService.init().then(initialized => {
          if (initialized) {
            socketService.startLocationUpdates(getCurrentLocation);
          }
        });
      } else if (socketService.isLocationSharingEnabled()) {
        console.log('[MeScreen] Socket already authenticated, updating location function');
        socketService.startLocationUpdates(getCurrentLocation);
      }
    }

    // Only disconnect on unmount if we're navigating away from the app, not just to another tab
    return () => {
      // Don't disconnect when the component unmounts, only update if not sharing
      console.log('[MeScreen] Cleanup effect running');
      if (!sharePosition && socketService.isLocationSharingEnabled()) {
        console.log('[MeScreen] Location sharing disabled, stopping updates');
        socketService.stopLocationUpdates();
      }
    };
  }, [user, sharePosition, getCurrentLocation]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Only update profile for aboutMe and allowDirectMessages
      const result = await updateUserProfile({
        bio: aboutMe,
        enableDms: allowDirectMessages,
        // Don't include sharePosition here as we're managing it separately
      });
      
      if (result.success && result.user) {
        // Update user in context with the latest data
        await login(
          { ...user, ...result.user },
          await AsyncStorage.getItem('token') || ''
        );
        
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'An error occurred while updating your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSharePosition = async (value: boolean) => {
    // Update state
    setSharePosition(value);
    
    // Save to AsyncStorage and update socket connection
    await socketService.saveLocationSharingPreference(value);
    
    // Immediate feedback about location sharing
    if (value) {
      Alert.alert(
        'Location Sharing',
        'Your location will be shared with other pilgrims. You can turn this off at any time.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearStorage = async () => {
    Alert.alert(
      'Clear Storage',
      'This will clear all stored data and log you out. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              // Stop location sharing if it's active
              if (socketService.isLocationSharingEnabled()) {
                await socketService.saveLocationSharingPreference(false);
              }
              
              // Clear all data from AsyncStorage
              await AsyncStorage.clear();
              console.log('[MeScreen] AsyncStorage cleared');
              
              // Show confirmation
              Alert.alert('Success', 'All local data has been cleared');
              
              // Log the user out
              if (logout) {
                logout();
              }
            } catch (error) {
              console.error('[MeScreen] Error clearing storage:', error);
              Alert.alert('Error', 'Failed to clear storage');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {user ? (
          <>
            <View style={styles.profileHeader}>
              <Text style={styles.nickname}>{user.nickname}</Text>
              <Text style={styles.phoneNumber}>{user.phoneNumber}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>About Me</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="Tell other pilgrims about yourself..."
                value={aboutMe}
                onChangeText={setAboutMe}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.toggleContainer}>
                <Text style={styles.label}>Allow Direct Messages</Text>
                <Switch
                  value={allowDirectMessages}
                  onValueChange={setAllowDirectMessages}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={allowDirectMessages ? '#007AFF' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.toggleDescription}>
                When enabled, other pilgrims can send you direct messages
              </Text>
            </View>

            {/* Divider to separate settings that require saving from those that don't */}
            <View style={styles.divider} />

            <View style={styles.section}>
              <View style={styles.toggleContainer}>
                <Text style={styles.label}>Share my position</Text>
                <Switch
                  value={sharePosition}
                  onValueChange={handleToggleSharePosition}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={sharePosition ? '#007AFF' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.toggleDescription}>
                When enabled, other pilgrims can see your current location on the map
              </Text>
              <Text style={styles.immediateEffect}>
                Changes take effect immediately
              </Text>
              {sharePosition && (
                <View style={styles.sharingInfoContainer}>
                  <Text style={styles.sharingInfo}>
                    Your location is being shared every 10 seconds
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            
            {/* Debug button to clear storage */}
            <TouchableOpacity
              style={styles.clearStorageButton}
              onPress={handleClearStorage}
            >
              <Text style={styles.clearStorageText}>Clear Local Storage</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.notLoggedIn}>
            <Text style={styles.notLoggedInText}>Please log in to view your profile</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  immediateEffect: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sharingInfoContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  sharingInfo: {
    fontSize: 14,
    color: '#0D47A1',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notLoggedInText: {
    fontSize: 18,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 24,
  },
  clearStorageButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E22D22',
  },
  clearStorageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 