import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, Image, ScrollView } from 'react-native';

interface StageDetails {
  id: string;
  length: number;
  description: string;
  images: string[];
}

interface StageModalProps {
  visible: boolean;
  stageDetails: StageDetails | null;
  isLoading: boolean;
  onClose: () => void;
}

export const StageModal: React.FC<StageModalProps> = ({
  visible,
  stageDetails,
  isLoading,
  onClose,
}) => {
  const [imageLoading, setImageLoading] = useState<boolean[]>([]);
  const [imageErrors, setImageErrors] = useState<boolean[]>([]);

  const handleImageLoad = (index: number) => {
    console.log(`Image ${index} loaded successfully`);
    const newLoading = [...imageLoading];
    newLoading[index] = false;
    setImageLoading(newLoading);
  };

  const handleImageError = (index: number, error: any) => {
    console.error(`Error loading image ${index}:`, error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      nativeError: error.nativeError
    });
    const newLoading = [...imageLoading];
    newLoading[index] = false;
    setImageLoading(newLoading);
    
    const newErrors = [...imageErrors];
    newErrors[index] = true;
    setImageErrors(newErrors);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : stageDetails ? (
            <ScrollView>
              <Text style={styles.modalTitle}>Stage {stageDetails.id}</Text>
              <Text style={styles.detailText}>Length: {stageDetails.length} km</Text>
              <Text style={styles.detailText}>{stageDetails.description}</Text>
              {stageDetails.images && stageDetails.images.length > 0 && (
                <ScrollView horizontal style={styles.imageRow}>
                  {stageDetails.images.map((url, idx) => {
                    console.log(`Loading image ${idx}:`, url);
                    return (
                      <View key={idx} style={styles.imageContainer}>
                        {imageLoading[idx] && (
                          <ActivityIndicator size="small" color="#007AFF" style={styles.imageLoader} />
                        )}
                        {imageErrors[idx] ? (
                          <View style={[styles.image, styles.errorImage]}>
                            <Text style={styles.errorText}>Image not available</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: url }}
                            style={styles.image}
                            onLoad={() => handleImageLoad(idx)}
                            onError={(error) => handleImageError(idx, error)}
                          />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </ScrollView>
          ) : null}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
  detailText: {
    marginBottom: 10,
  },
  imageRow: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 120,
    height: 80,
    borderRadius: 5,
  },
  errorImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -10,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});