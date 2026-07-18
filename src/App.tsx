import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Analytics = lazy(() => import('./pages/Analytics'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const DatasetAnalysis = lazy(() => import('./pages/DatasetAnalysis'));
const Audit = lazy(() => import('./pages/Audit'));

// Skeleton loader for suspense fallback
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-bg-primary h-full w-full p-8">
    <div className="w-full max-w-4xl space-y-6">
      <div className="h-10 w-64 bg-border-primary/50 rounded skeleton"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-border-primary/50 rounded-xl skeleton"></div>
        <div className="h-32 bg-border-primary/50 rounded-xl skeleton"></div>
        <div className="h-32 bg-border-primary/50 rounded-xl skeleton"></div>
      </div>
      <div className="h-96 w-full bg-border-primary/50 rounded-xl skeleton"></div>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}>
              <Home />
            </Suspense>
          } />
          <Route path="analysis" element={
            <Suspense fallback={<PageLoader />}>
              <DatasetAnalysis />
            </Suspense>
          } />
          <Route path="analytics" element={
            <Suspense fallback={<PageLoader />}>
              <Analytics />
            </Suspense>
          } />
          <Route path="history" element={
            <Suspense fallback={<PageLoader />}>
              <History />
            </Suspense>
          } />
          <Route path="audit" element={
            <Suspense fallback={<PageLoader />}>
              <Audit />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          } />
          <Route path="*" element={
            <Suspense fallback={<PageLoader />}>
              <Home />
            </Suspense>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
