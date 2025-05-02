import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { activateUser, loginUser } from '../services/userService';
import { useAuth } from '../context/AuthContext';

export default function ActivationScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleActivation = async () => {
    if (!phoneNumber || !activationCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await activateUser(phoneNumber, activationCode);
      
      if (result.success) {
        // After successful activation, try to log in the user
        const loginResult = await loginUser(phoneNumber, ''); // Password won't be checked for this flow
        
        if (loginResult.success && loginResult.user) {
          await login(loginResult.user);
          Alert.alert(
            'Activation Successful',
            'Your account has been activated successfully!',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)'),
              },
            ]
          );
        } else {
          Alert.alert(
            'Activation Successful',
            'Your account has been activated. Please log in.',
            [
              {
                text: 'OK',
                onPress: () => router.push('./login'),
              },
            ]
          );
        }
      } else {
        Alert.alert('Activation Failed', result.message || 'Invalid activation code');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Activate Your Account</Text>
        <Text style={styles.subtitle}>Enter the activation code sent to your phone</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Activation Code"
            value={activationCode}
            onChangeText={setActivationCode}
            keyboardType="number-pad"
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleActivation}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Activating...' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('./login')}>
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
}); 