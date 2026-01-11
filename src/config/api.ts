// API Configuration for different environments

const getApiUrl = () => {
  // Check if we're in the browser and have Vite environment variables
  if (typeof window !== 'undefined') {
    // Production build with Vite environment variables
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // Development mode
    if (import.meta.env.DEV) {
      return 'http://localhost:3000';
    }
  }

  // Server-side or fallback
  return process.env.API_URL || 'http://localhost:3000';
};

const getTrpcUrl = () => {
  // Check if we're in the browser and have Vite environment variables
  if (typeof window !== 'undefined') {
    // Production build with Vite environment variables
    if (import.meta.env.VITE_TRPC_URL) {
      return import.meta.env.VITE_TRPC_URL;
    }

    // Development mode
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/trpc';
    }
  }

  // Server-side or fallback
  return process.env.TRPC_URL || 'http://localhost:3000/trpc';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TRPC_URL: getTrpcUrl(),
  TIMEOUT: 30000, // 30 seconds
} as const;

// Export individual URLs for convenience
export const API_URL = API_CONFIG.BASE_URL;
export const TRPC_URL = API_CONFIG.TRPC_URL;
