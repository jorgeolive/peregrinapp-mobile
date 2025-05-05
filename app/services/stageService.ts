import { StageDetails } from '../types/stage';
import { API_BASE_URL } from '../config';
import { getAuthHeader } from './userService';

export const fetchStageDetails = async (stageId: string): Promise<StageDetails> => {
  const url = `${API_BASE_URL}/peregrinapp/stages/${stageId}`;
  console.log('Fetching stage details from:', url);
  
  const headers = await getAuthHeader();
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    console.error(`Failed to fetch stage details: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch stage details: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Received stage details:', data);
  
  // Convert relative image URLs to absolute URLs
  if (data.images && Array.isArray(data.images)) {
    data.images = data.images.map((imageUrl: string) => {
      if (imageUrl.startsWith('/')) {
        return `${API_BASE_URL}${imageUrl}`;
      }
      return imageUrl;
    });
    console.log('Processed image URLs:', data.images);
  }
  
  return data;
};
