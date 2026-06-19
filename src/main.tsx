// Point d'entrée React + initialisation du branding (rasterisation logo / cachet pour le PDF).

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadBranding } from './assets/branding';
import './styles.css';

// Lance le chargement du branding en parallèle du rendu (non bloquant).
loadBranding();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
