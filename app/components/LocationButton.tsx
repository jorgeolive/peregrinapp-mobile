import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface LocationButtonProps {
  onPress: () => void;
}

export const LocationButton: React.FC<LocationButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.locationButton} onPress={onPress}>
      <MaterialIcons name="my-location" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
}); 