import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Using useEffect to handle navigation after render
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        // Use relative paths
        router.replace('./auth/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading screen while checking auth status
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
} 