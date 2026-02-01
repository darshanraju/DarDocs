import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { Sidebar } from '@dardocs/editor';
import { WorkspacePage } from './pages/WorkspacePage';
import { DocumentPage } from './pages/DocumentPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/doc/:docId" element={<DocumentPage />} />
        </Routes>
      </div>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
