/**
 * Get the Python backend URL dynamically
 * In Electron, this uses the port discovered at runtime
 * In web/Vercel, this uses the environment variable
 */
export async function getBackendUrl(): Promise<string> {
  // Check if running in Electron
  if (typeof window !== 'undefined' && (window as any).electron?.isElectron) {
    try {
      const ports = await (window as any).electron.getPorts();
      return `http://localhost:${ports.pythonPort}`;
    } catch (error) {
      console.error('Failed to get ports from Electron:', error);
      // Fallback to default
      return 'http://localhost:8000';
    }
  }
  
  // In production/Vercel, use environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For server-side in Electron (API routes)
  // Check if Python port was passed through environment
  if (process.env.PYTHON_PORT) {
    return `http://localhost:${process.env.PYTHON_PORT}`;
  }
  
  // Default fallback
  return 'http://localhost:8000';
}

/**
 * Get backend URL synchronously for server-side usage
 * This is for API routes that can't use async in certain contexts
 */
export function getBackendUrlSync(): string {
  console.log('[getBackendUrlSync] Resolving backend URL...');
  console.log('[getBackendUrlSync] PYTHON_PORT:', process.env.PYTHON_PORT);
  console.log('[getBackendUrlSync] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  
  // For server-side in Electron (API routes)
  // Check if Python port was passed through environment
  if (process.env.PYTHON_PORT) {
    const url = `http://localhost:${process.env.PYTHON_PORT}`;
    console.log('[getBackendUrlSync] Using PYTHON_PORT:', url);
    return url;
  }
  
  // In production/Vercel, use environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('[getBackendUrlSync] Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default fallback
  const fallback = 'http://localhost:8000';
  console.log('[getBackendUrlSync] Using fallback:', fallback);
  return fallback;
}