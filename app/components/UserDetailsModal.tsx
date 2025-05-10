import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface UserDetailsProps {
  visible: boolean;
  userId?: string;
  username?: string;
  userBio?: string;
  enableDms?: boolean;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onSendDM: () => void;
  onStartChat?: (userId: string, name: string) => void;
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
  onSendDM,
  onStartChat
}) => {
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
              
              {enableDms && (
                <TouchableOpacity style={styles.button} onPress={onSendDM}>
                  <Text style={styles.buttonText}>Send Message</Text>
                </TouchableOpacity>
              )}
              
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