import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AuthIndex() {
  const router = useRouter();
  
  useEffect(() => {
    // Navigate to login screen using a relative path
    const timer = setTimeout(() => {
      router.replace('./login');
    }, 0);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return null;
} 