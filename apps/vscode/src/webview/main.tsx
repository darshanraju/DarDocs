import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WebviewApp } from './WebviewApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebviewApp />
  </StrictMode>
);
