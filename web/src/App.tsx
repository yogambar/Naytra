import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StatusPage } from './pages/StatusPage';
import { Skeleton } from './design/Skeleton';

const DesignSystem = React.lazy(() =>
  import('./pages/DesignSystem').then((m) => ({ default: m.DesignSystem }))
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
        <Route path="/" element={<StatusPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/design" element={<DesignSystem />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
