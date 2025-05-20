import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface LayerVisibility {
  caminoNorte: boolean;
  albergues: boolean;
}

interface LayerSelectorProps {
  visibility: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

export const LayerSelector: React.FC<LayerSelectorProps> = ({ 
  visibility, 
  onToggleLayer 
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="layers" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View 
            style={styles.modalView}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Map Layers</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.layerItem} 
              onPress={() => onToggleLayer('caminoNorte')}
            >
              <MaterialIcons 
                name={visibility.caminoNorte ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={visibility.caminoNorte ? "#E91E63" : "#757575"} 
              />
              <View style={styles.layerInfo}>
                <Text style={styles.layerName}>Camino Norte</Text>
                <Text style={styles.layerDescription}>Pilgrimage route stages</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.layerItem} 
              onPress={() => onToggleLayer('albergues')}
            >
              <MaterialIcons 
                name={visibility.albergues ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={visibility.albergues ? "#4CAF50" : "#757575"} 
              />
              <View style={styles.layerInfo}>
                <Text style={styles.layerName}>Albergues</Text>
                <Text style={styles.layerDescription}>Pilgrim hostels and accommodations</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  layerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  layerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  layerDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
}); 