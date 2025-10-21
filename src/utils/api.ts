// Utilidad para manejar URLs de la API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qr-restaurant-backend-l8gu1ke8y-gueremys-projects.vercel.app';

// Función para construir URLs de la API
export const buildApiUrl = (endpoint: string): string => {
  // Asegurar que el endpoint comience con /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Función para hacer fetch con la URL base configurada
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  console.log('🌐 API Request:', url);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
};

// Función para hacer fetch autenticado
export const authenticatedFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem('token');
  
  return apiFetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });
};