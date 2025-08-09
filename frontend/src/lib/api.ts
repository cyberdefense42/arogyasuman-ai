import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  getUserProfile: () => fetchWithAuth('/api/user/profile'),
  
  uploadHealthData: (data: FormData) => 
    fetchWithAuth('/api/upload', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: data,
    }),
    
  getHealthReports: () => fetchWithAuth('/api/reports'),
  
  getHealthReport: (id: string) => fetchWithAuth(`/api/reports/${id}`),
};