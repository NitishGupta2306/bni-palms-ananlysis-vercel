import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/config/api';

interface ChapterAuth {
  chapterId: string;
  token: string;
  expiresAt: Date;
  chapterName: string;
}

interface AdminAuth {
  token: string;
  expiresAt: Date;
}

interface AuthContextType {
  chapterAuth: ChapterAuth | null;
  adminAuth: AdminAuth | null;
  authenticateChapter: (chapterId: string, password: string) => Promise<{ success: boolean; error?: string; attemptsRemaining?: number; lockedOut?: boolean; retryAfterMinutes?: number }>;
  authenticateAdmin: (password: string) => Promise<{ success: boolean; error?: string; attemptsRemaining?: number; lockedOut?: boolean; retryAfterMinutes?: number }>;
  isChapterAuthenticated: (chapterId: string) => boolean;
  isAdminAuthenticated: () => boolean;
  clearChapterAuth: () => void;
  clearAdminAuth: () => void;
  clearAllAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CHAPTER_AUTH_KEY = 'bni_chapter_auth';
const ADMIN_AUTH_KEY = 'bni_admin_auth';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chapterAuth, setChapterAuth] = useState<ChapterAuth | null>(null);
  const [adminAuth, setAdminAuth] = useState<AdminAuth | null>(null);

  // Load auth from localStorage on mount
  useEffect(() => {
    const loadAuth = () => {
      // Load chapter auth
      const chapterAuthStr = localStorage.getItem(CHAPTER_AUTH_KEY);
      if (chapterAuthStr) {
        try {
          const auth = JSON.parse(chapterAuthStr);
          const expiresAt = new Date(auth.expiresAt);

          if (expiresAt > new Date()) {
            setChapterAuth({ ...auth, expiresAt });
          } else {
            localStorage.removeItem(CHAPTER_AUTH_KEY);
          }
        } catch (error) {
          console.error('Failed to load chapter auth:', error);
          localStorage.removeItem(CHAPTER_AUTH_KEY);
        }
      }

      // Load admin auth
      const adminAuthStr = localStorage.getItem(ADMIN_AUTH_KEY);
      if (adminAuthStr) {
        try {
          const auth = JSON.parse(adminAuthStr);
          const expiresAt = new Date(auth.expiresAt);

          if (expiresAt > new Date()) {
            setAdminAuth({ ...auth, expiresAt });
          } else {
            localStorage.removeItem(ADMIN_AUTH_KEY);
          }
        } catch (error) {
          console.error('Failed to load admin auth:', error);
          localStorage.removeItem(ADMIN_AUTH_KEY);
        }
      }
    };

    loadAuth();
  }, []);

  // Auto-clear expired tokens
  useEffect(() => {
    const interval = setInterval(() => {
      if (chapterAuth && chapterAuth.expiresAt <= new Date()) {
        clearChapterAuth();
      }
      if (adminAuth && adminAuth.expiresAt <= new Date()) {
        clearAdminAuth();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [chapterAuth, adminAuth]);

  const authenticateChapter = async (chapterId: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/authenticate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const auth: ChapterAuth = {
          chapterId: chapterId,
          token: data.token,
          expiresAt,
          chapterName: data.chapter.name,
        };

        setChapterAuth(auth);
        localStorage.setItem(CHAPTER_AUTH_KEY, JSON.stringify(auth));

        return { success: true };
      } else {
        // Failed
        return {
          success: false,
          error: data.error || 'Authentication failed',
          attemptsRemaining: data.attempts_remaining,
          lockedOut: data.locked_out,
          retryAfterMinutes: data.retry_after_minutes,
        };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  };

  const authenticateAdmin = async (password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/authenticate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const auth: AdminAuth = {
          token: data.token,
          expiresAt,
        };

        setAdminAuth(auth);
        localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth));

        return { success: true };
      } else {
        // Failed
        return {
          success: false,
          error: data.error || 'Authentication failed',
          attemptsRemaining: data.attempts_remaining,
          lockedOut: data.locked_out,
          retryAfterMinutes: data.retry_after_minutes,
        };
      }
    } catch (error) {
      console.error('Admin authentication error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  };

  const isChapterAuthenticated = (chapterId: string): boolean => {
    if (!chapterAuth) return false;
    if (chapterAuth.chapterId !== chapterId) return false;
    if (chapterAuth.expiresAt <= new Date()) {
      clearChapterAuth();
      return false;
    }
    return true;
  };

  const isAdminAuthenticated = (): boolean => {
    if (!adminAuth) return false;
    if (adminAuth.expiresAt <= new Date()) {
      clearAdminAuth();
      return false;
    }
    return true;
  };

  const clearChapterAuth = () => {
    setChapterAuth(null);
    localStorage.removeItem(CHAPTER_AUTH_KEY);
  };

  const clearAdminAuth = () => {
    setAdminAuth(null);
    localStorage.removeItem(ADMIN_AUTH_KEY);
  };

  const clearAllAuth = () => {
    clearChapterAuth();
    clearAdminAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        chapterAuth,
        adminAuth,
        authenticateChapter,
        authenticateAdmin,
        isChapterAuthenticated,
        isAdminAuthenticated,
        clearChapterAuth,
        clearAdminAuth,
        clearAllAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
