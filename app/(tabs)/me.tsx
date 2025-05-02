import React from 'react';
import { StyleSheet, Text, TextInput, View, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/profileService';

export default function MeScreen() {
  const { user, login } = useAuth();
  const [aboutMe, setAboutMe] = useState('');
  const [allowDirectMessages, setAllowDirectMessages] = useState(false);
  const [sharePosition, setSharePosition] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Populate data from user object when it's available
    if (user) {
      setAboutMe(user.bio || '');
      setAllowDirectMessages(user.enableDms || false);
      setSharePosition(user.sharePosition || false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const result = await updateUserProfile({
        bio: aboutMe,
        enableDms: allowDirectMessages,
        sharePosition: sharePosition,
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

            <View style={styles.section}>
              <View style={styles.toggleContainer}>
                <Text style={styles.label}>Share my position</Text>
                <Switch
                  value={sharePosition}
                  onValueChange={setSharePosition}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={sharePosition ? '#007AFF' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.toggleDescription}>
                When enabled, other pilgrims can see your current location on the map
              </Text>
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
}); 