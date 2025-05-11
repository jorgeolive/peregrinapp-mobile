import { Image, StyleSheet, Platform } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/peregrinapp_logo.png')}
          style={styles.appLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to PeregrinApp!</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <ThemedView style={styles.featureContainer}>
        <ThemedText type="subtitle">Explore Your Journey</ThemedText>
        <ThemedText>
          Navigate through the Camino de Santiago with our interactive map. 
          Find detailed information about your pilgrimage route.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.featureContainer}>
        <ThemedText type="subtitle">Discover Accommodations</ThemedText>
        <ThemedText>
          See hostel details by clicking on them in the map. View availability, 
          prices, and amenities to plan your overnight stays.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.featureContainer}>
        <ThemedText type="subtitle">Stage Information</ThemedText>
        <ThemedText>
          Access detailed stage information by selecting routes on the map. 
          Get distance, difficulty level and points of interest.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.featureContainer}>
        <ThemedText type="subtitle">Connect with Pilgrims</ThemedText>
        <ThemedText>
          Chat with other pilgrims by clicking on their profile icons on the map. 
          Share experiences, tips, and make new friends along the way.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.importantNotice}>
        <ThemedText type="subtitle">Important Notice</ThemedText>
        <ThemedText>
          To use all features of PeregrinApp, you need to <ThemedText type="defaultSemiBold">activate location sharing</ThemedText>. 
          This allows you to see nearby pilgrims and receive relevant information about your surroundings.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  featureContainer: {
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#A1CEDC',
  },
  importantNotice: {
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFCC00',
  },
  appLogo: {
    height: 160,
    width: 160,
    bottom: 10,
    right: 20,
    position: 'absolute',
  },
});
