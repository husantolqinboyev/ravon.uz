import { useState, useEffect, useCallback } from 'react';
import { getSession, saveSession, clearSession, type UserSession } from '@/lib/db';

interface UseAuthReturn {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithCode: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from IndexedDB on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const loginWithCode = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Verify code with backend
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'verify', code }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.valid) {
        console.error('Code verification failed:', result.error);
        return false;
      }

      // Save session to IndexedDB
      const session: Omit<UserSession, 'id'> = {
        telegramUserId: result.user.telegramUserId,
        username: result.user.username,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        photoUrl: result.user.photoUrl,
        authDate: new Date(),
      };

      await saveSession(session);
      setUser(session as UserSession);
      
      console.log('Login successful:', result.user.username || result.user.telegramUserId);
      return true;

    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearSession();
      setUser(null);
      console.log('Logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginWithCode,
    logout,
  };
}
