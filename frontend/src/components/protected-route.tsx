import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  type: 'chapter' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, type }) => {
  const { isChapterAuthenticated, isAdminAuthenticated } = useAuth();
  const params = useParams();

  if (type === 'chapter') {
    const chapterId = params.chapterId;

    if (!chapterId) {
      return <Navigate to="/" replace />;
    }

    if (!isChapterAuthenticated(chapterId)) {
      return <Navigate to="/" replace />;
    }
  } else if (type === 'admin') {
    if (!isAdminAuthenticated()) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
