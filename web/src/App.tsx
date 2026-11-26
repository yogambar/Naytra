import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { Skeleton } from './design/Skeleton';

// Auth Pages (Lazy loaded)
const WelcomePage = React.lazy(() =>
  import('./pages/WelcomePage').then((m) => ({ default: m.WelcomePage }))
);
const SignUpPage = React.lazy(() =>
  import('./pages/SignUpPage').then((m) => ({ default: m.SignUpPage }))
);
const SignInPage = React.lazy(() =>
  import('./pages/SignInPage').then((m) => ({ default: m.SignInPage }))
);
const VerifyEmailPage = React.lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const CompleteProfilePage = React.lazy(() =>
  import('./pages/CompleteProfilePage').then((m) => ({ default: m.CompleteProfilePage }))
);
const ForgotPasswordPage = React.lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);

// App Pages (Lazy loaded)
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
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
const SignupBonusPage = React.lazy(() =>
  import('./pages/SignupBonusPage').then((m) => ({ default: m.SignupBonusPage }))
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
    <AuthProvider>
      <WalletProvider>
        <Suspense
        fallback={
          <div className="min-h-screen bg-surface-base p-8 flex items-center justify-center">
            <Skeleton variant="rectangular" width={300} height={200} />
          </div>
        }
      >
        <Routes>
          {/* Public Auth Flow Routes */}
          <Route
            path="/welcome"
            element={
              <Suspense fallback={<PageFallback />}>
                <WelcomePage />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<PageFallback />}>
                <SignUpPage />
              </Suspense>
            }
          />
          <Route
            path="/signin"
            element={
              <Suspense fallback={<PageFallback />}>
                <SignInPage />
              </Suspense>
            }
          />
          <Route
            path="/verify-email"
            element={
              <Suspense fallback={<PageFallback />}>
                <VerifyEmailPage />
              </Suspense>
            }
          />
          <Route
            path="/complete-profile"
            element={
              <Suspense fallback={<PageFallback />}>
                <CompleteProfilePage />
              </Suspense>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <Suspense fallback={<PageFallback />}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />

          {/* Protected Application Routes (Requires Verified Auth & Complete Profile) */}
          <Route element={<ProtectedRoute />}>
            {/* Signup Bonus page (no AppShell/bottom nav) */}
            <Route
              path="/signup-bonus"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SignupBonusPage />
                </Suspense>
              }
            />
            <Route element={<AppShell />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
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
          </Route>

          {/* Diagnostic & Showcase Routes */}
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

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </WalletProvider>
    </AuthProvider>
  );
};

export default App;
