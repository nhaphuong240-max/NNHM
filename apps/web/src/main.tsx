import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { initWebVitals } from './lib/web-vitals';
import { applyHostTenantOverride } from './lib/tenant-host';

initWebVitals();
applyHostTenantOverride();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
