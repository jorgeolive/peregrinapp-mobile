import { API_BASE_URL } from '../config';
import { User } from '../types/user';
import { getAuthHeader } from './userService';

/**
 * Update user profile
 */
export const updateUserProfile = async (
  profileData: {
    bio?: string;
    enableDms?: boolean;
  }
): Promise<{ success: boolean; message?: string; user?: User }> => {
  try {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE_URL}/peregrinapp/users/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });

    if (response.status === 200) {
      const data = await response.json();
      return { success: true, user: data.user };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Profile update failed' };
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

/**
 * Get user profile data
 */
export const getUserProfile = async (): Promise<{ success: boolean; message?: string; user?: User }> => {
  try {
    const headers = await getAuthHeader();
    
    const response = await fetch(`${API_BASE_URL}/peregrinapp/users/profile`, {
      method: 'GET',
      headers,
    });

    if (response.status === 200) {
      const user = await response.json();
      return { success: true, user };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Failed to get profile' };
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}; 