import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../design/Skeleton';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, profile, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-base p-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-glass border border-surface-border flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-brand-marigold border-t-transparent animate-spin" />
        </div>
        <Skeleton width="180px" height="20px" />
      </div>
    );
  }

  // Not signed in -> redirect to Welcome screen
  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  // Check email verification (allow bypassing only if profile says email_verified or user says verified)
  const isVerified = Boolean(profile?.email_verified || user?.emailVerified);
  if (!isVerified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  // Check profile completion (name, dob, 18+ check, terms)
  if (profile && !profile.profile_complete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
