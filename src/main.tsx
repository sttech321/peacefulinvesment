import React from 'react'
import { createRoot } from 'react-dom/client'
import { setupStagewise } from './utils/toolbar'
import App from './App.tsx'
import './index.css'

// Setup the 21st extension toolbar
setupStagewise();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
