import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native';

interface AlbergueFeature {
  properties: {
    name: string;
    id: string;
    [key: string]: any;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface AlbergueDetails {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  price?: string;
}

interface AlbergueModalProps {
  selectedAlbergue: AlbergueFeature | null;
  albergueDetails: AlbergueDetails | null;
  isLoading: boolean;
  onClose: () => void;
}

export const AlbergueModal: React.FC<AlbergueModalProps> = ({
  selectedAlbergue,
  albergueDetails,
  isLoading,
  onClose,
}) => {
  return (
    <Modal
      visible={!!selectedAlbergue}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{selectedAlbergue?.properties.name}</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : albergueDetails ? (
            <View style={styles.detailsContainer}>
              {albergueDetails.description && (
                <Text style={styles.detailText}>{albergueDetails.description}</Text>
              )}
              {albergueDetails.address && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailText}>{albergueDetails.address}</Text>
                </View>
              )}
              {albergueDetails.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${albergueDetails.phone?.replace(/\s+/g, '')}`)}
                  >
                    <Text style={[styles.detailText, { color: '#007AFF', textDecorationLine: 'underline' }]}>
                      {albergueDetails.phone}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {albergueDetails.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailText}>{albergueDetails.email}</Text>
                </View>
              )}
              {albergueDetails.capacity && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Capacity:</Text>
                  <Text style={styles.detailText}>{albergueDetails.capacity} people</Text>
                </View>
              )}
              {albergueDetails.price && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price:</Text>
                  <Text style={styles.detailText}>{albergueDetails.price}</Text>
                </View>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loader: {
    marginVertical: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  detailText: {
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 