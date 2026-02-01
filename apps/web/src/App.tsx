import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { Sidebar, useAuthStore } from '@dardocs/editor';
import { WorkspacePage } from './pages/WorkspacePage';
import { DocumentPage } from './pages/DocumentPage';
import { GodModePage } from './pages/GodModePage';
import { AuthPage } from './pages/AuthPage';

function AuthenticatedLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <Routes>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/doc/:docId" element={<DocumentPage />} />
        <Route path="/templates/god-mode" element={<GodModePage />} />
      </Routes>
    </div>
  );
}

function App() {
  const { user, loading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user ? <AuthenticatedLayout /> : <AuthPage />}
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
