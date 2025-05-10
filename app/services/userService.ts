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
    console.log(`[UserService] Attempting login for: ${phoneNumber} to ${API_BASE_URL}/peregrinapp/login`);
    const response = await fetch(`${API_BASE_URL}/peregrinapp/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber,
        password,
      }),
    });

    // Check the content type to see if we're getting JSON back
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[UserService] Server returned non-JSON content: ${contentType}`);
      // Try to get the text response for debugging
      const textResponse = await response.text();
      console.error(`[UserService] Response text (first 150 chars): ${textResponse.substring(0, 150)}`);
      return { 
        success: false, 
        message: `Server returned unexpected content type: ${contentType || 'unknown'}. Please check your server settings.` 
      };
    }

    if (response.status === 200) {
      const data = await response.json();
      console.log('[UserService] Login successful');
      return {
        success: true,
        user: data.user,
        token: data.token,
        message: data.message
      };
    } else {
      try {
        const data = await response.json();
        return { success: false, message: data.message || 'Login failed' };
      } catch (parseError) {
        console.error('[UserService] Failed to parse error response:', parseError);
        return { success: false, message: `Login failed (Status ${response.status})` };
      }
    }
  } catch (error) {
    console.error('[UserService] Login error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? `Network error: ${error.message}` : 'Network error. Please try again.' 
    };
  }
}; 

/**
 * Get user details by ID
 */
export const getUserDetails = async (userId: string): Promise<{
  success: boolean;
  user?: {
    id: string;
    name: string;
    bio: string;
    enableDms: boolean;
  };
  message?: string;
}> => {
  try {
    console.log(`[UserService] Getting user details for userId: ${userId}`);
    const headers = await getAuthHeader();
    console.log(`[UserService] Request headers:`, JSON.stringify(headers));
    
    const url = `${API_BASE_URL}/peregrinapp/users/${userId}`;
    console.log(`[UserService] Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    console.log(`[UserService] Response status: ${response.status}`);
    const responseData = await response.json();
    console.log(`[UserService] Response data:`, JSON.stringify(responseData));

    if (response.status === 200) {
      console.log(`[UserService] Successfully retrieved user details`);
      return { success: true, user: responseData };
    } else {
      console.error(`[UserService] Failed to get user details. Status: ${response.status}, Message: ${responseData.message || 'No message'}`);
      return { success: false, message: responseData.message || 'Failed to get user details' };
    }
  } catch (error) {
    console.error('[UserService] Error fetching user details:', error);
    if (error instanceof Error) {
      console.error(`[UserService] Error name: ${error.name}, message: ${error.message}`);
      if (error.stack) {
        console.error(`[UserService] Error stack: ${error.stack}`);
      }
    }
    return { success: false, message: 'Network error. Please try again.' };
  }
}; 