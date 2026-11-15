import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { Skeleton } from './design/Skeleton';

const HoldingsPage = React.lazy(() =>
  import('./pages/HoldingsPage').then((m) => ({ default: m.HoldingsPage }))
);
const LearnPage = React.lazy(() =>
  import('./pages/LearnPage').then((m) => ({ default: m.LearnPage }))
);
const WalletPage = React.lazy(() =>
  import('./pages/WalletPage').then((m) => ({ default: m.WalletPage }))
);
const ProfilePage = React.lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const StatusPage = React.lazy(() =>
  import('./pages/StatusPage').then((m) => ({ default: m.StatusPage }))
);
const DesignSystem = React.lazy(() =>
  import('./pages/DesignSystem').then((m) => ({ default: m.DesignSystem }))
);

const PageFallback: React.FC = () => (
  <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto animate-pulse">
    <Skeleton width="180px" height="28px" />
    <Skeleton width="100%" height="160px" className="rounded-2xl" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Skeleton height="80px" className="rounded-xl" />
      <Skeleton height="80px" className="rounded-xl" />
      <Skeleton height="80px" className="rounded-xl" />
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-base p-8 flex items-center justify-center">
          <Skeleton variant="rectangular" width={300} height={200} />
        </div>
      }
    >
      <Routes>
        {/* Main Application Shell with Bottom Tab Bar & Side Rail */}
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/holdings"
            element={
              <Suspense fallback={<PageFallback />}>
                <HoldingsPage />
              </Suspense>
            }
          />
          <Route
            path="/learn"
            element={
              <Suspense fallback={<PageFallback />}>
                <LearnPage />
              </Suspense>
            }
          />
          <Route
            path="/wallet"
            element={
              <Suspense fallback={<PageFallback />}>
                <WalletPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<PageFallback />}>
                <ProfilePage />
              </Suspense>
            }
          />
        </Route>

        {/* Independent Diagnostic & Showcase Routes */}
        <Route
          path="/status"
          element={
            <Suspense fallback={<PageFallback />}>
              <StatusPage />
            </Suspense>
          }
        />
        <Route
          path="/design"
          element={
            <Suspense fallback={<PageFallback />}>
              <DesignSystem />
            </Suspense>
          }
        />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
