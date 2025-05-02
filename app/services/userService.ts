import { API_BASE_URL } from '../config';
import { User } from '../types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get authentication header with token
 */
export const getAuthHeader = async (): Promise<HeadersInit> => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

/**
 * Register a new user with the provided data
 */
export const registerUser = async (userData: Omit<User, 'id' | 'isActivated'>): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/peregrinapp/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        isActivated: false,
      }),
    });

    if (response.status === 201) {
      return { success: true };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Registration failed' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

/**
 * Activate a user account with the provided activation code
 */
export const activateUser = async (phoneNumber: string, activationCode: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/peregrinapp/users/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        activationCode,
      }),
    });

    if (response.status === 200) {
      return { success: true };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Activation failed' };
    }
  } catch (error) {
    console.error('Activation error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

/**
 * Log in a user with phone number and password
 */
export const loginUser = async (phoneNumber: string, password: string): Promise<{
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/peregrinapp/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        password,
      }),
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        user: data.user,
        token: data.token,
        message: data.message
      };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}; 