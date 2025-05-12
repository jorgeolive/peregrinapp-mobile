import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../config';
import { getAuthHeader } from '../services/userService';

interface UserDetailsProps {
  visible: boolean;
  userId?: string;
  username?: string;
  userBio?: string;
  enableDms?: boolean;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onStartChat?: (userId: string, name: string) => void;
}

interface DistanceResponse {
  distance: number;
  units: string;
  formatted: string;
}

export const UserDetailsModal: React.FC<UserDetailsProps> = ({
  visible,
  userId,
  username,
  userBio,
  enableDms = false,
  loading,
  error,
  onClose,
  onStartChat
}) => {
  const [formattedDistance, setFormattedDistance] = useState<string | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when modal visibility changes or userId changes
    if (!visible || !userId) {
      setFormattedDistance(null);
      setDistanceLoading(false);
      setDistanceError(null);
      return;
    }

    // Fetch distance when modal is visible and we have a userId
    const fetchDistance = async () => {
      if (!userId) return;
      
      setDistanceLoading(true);
      setDistanceError(null);
      
      try {
        const headers = await getAuthHeader();
        const response = await fetch(`${API_BASE_URL}/peregrinapp/users/${userId}/distance`, {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const data: DistanceResponse = await response.json();
          setFormattedDistance(data.formatted);
        } else {
          const errorData = await response.json();
          setDistanceError(errorData.message || 'Failed to fetch distance');
        }
      } catch (error) {
        console.error('Error fetching distance:', error);
        setDistanceError('Network error. Could not fetch distance.');
      } finally {
        setDistanceLoading(false);
      }
    };

    fetchDistance();
  }, [visible, userId]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loading ? (
            <ActivityIndicator size="large" color="#1976D2" />
          ) : error ? (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.titleText}>Pilgrim Profile</Text>
              <Text style={styles.userName}>{username || 'Unknown'}</Text>
              <Text style={styles.userBio}>{userBio || 'No bio available'}</Text>
              
              {/* Distance information */}
              <View style={styles.distanceContainer}>
                {distanceLoading ? (
                  <ActivityIndicator size="small" color="#1976D2" />
                ) : distanceError ? (
                  <Text style={styles.distanceErrorText}>Unable to get distance</Text>
                ) : formattedDistance ? (
                  <Text style={styles.distanceText}>
                    Distance: <Text style={styles.distanceValue}>{formattedDistance}</Text>
                  </Text>
                ) : null}
              </View>
              
              {enableDms && onStartChat && userId && username && (
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#4CAF50' }]} 
                  onPress={() => onStartChat(userId, username)}
                >
                  <Text style={styles.buttonText}>Chat</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    elevation: 5,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userBio: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  distanceContainer: {
    width: '100%',
    padding: 8,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 16,
    color: '#555',
  },
  distanceValue: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  distanceErrorText: {
    fontSize: 14,
    color: '#ff6b6b',
  },
  button: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#757575',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  }
}); 