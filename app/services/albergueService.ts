import { AlbergueDetails } from '../types/map';

// Mock data for albergues
const mockAlbergues: Record<string, AlbergueDetails> = {
  '1': {
    name: 'Albergue de Peregrinos Santiago',
    description: 'A cozy albergue located in the heart of Santiago de Compostela, perfect for pilgrims completing their journey.',
    address: 'Rúa do Vilar, 1, 15705 Santiago de Compostela',
    phone: '+34 981 569 327',
    email: 'info@alberguesantiago.com',
    capacity: 50,
    price: '€12 per night'
  },
  '2': {
    name: 'Albergue San Martín Pinario',
    description: 'Historic albergue with beautiful architecture and peaceful atmosphere.',
    address: 'Praza da Inmaculada, 3, 15704 Santiago de Compostela',
    phone: '+34 981 560 282',
    email: 'reservas@sanmartinpinario.com',
    capacity: 100,
    price: '€15 per night'
  },
  '3': {
    name: 'Albergue Seminario Menor',
    description: 'Modern facilities with comfortable beds and good amenities.',
    address: 'Rúa da Conga, 15705 Santiago de Compostela',
    phone: '+34 981 580 000',
    email: 'info@seminariomenor.com',
    capacity: 80,
    price: '€10 per night'
  }
};

export const fetchAlbergueDetails = async (albergueId: string): Promise<AlbergueDetails> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get all mock albergue IDs
  const albergueIds = Object.keys(mockAlbergues);
  // Pick a random ID
  const randomId = albergueIds[Math.floor(Math.random() * albergueIds.length)];
  // Return the random albergue
  return mockAlbergues[randomId];
}; 