// Router applicatif FleetLink (HashRouter pour fonctionner dans la WebView Android sans serveur).
// Ajout par rapport à l'original Mine2Port :
//   - Route /login (couche cloud, non bloquante)
//   - Installation de l'auto-sync (sync-queue) au démarrage

import { useEffect } from 'react';
import { HashRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { SheetProvider } from './lib/store';
import { SECTIONS } from './data/sections';
import { HomeScreen } from './screens/HomeScreen';
import { IdentificationScreen } from './screens/IdentificationScreen';
import { PhotosScreen } from './screens/PhotosScreen';
import { BilanScreen } from './screens/BilanScreen';
import { RecapScreen } from './screens/RecapScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SectionScreen } from './components/SectionScreen';
import { installAutoSync } from './lib/sync-queue';

function LoginRoute() {
  const nav = useNavigate();
  return <LoginScreen onAuthenticated={() => nav('/', { replace: true })} />;
}

export default function App() {
  // Installation unique de l'auto-sync au montage (online listener + tentative initiale)
  useEffect(() => { installAutoSync(); }, []);

  return (
    <SheetProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/identification" element={<IdentificationScreen />} />
          {SECTIONS.map((sec) => (
            <Route key={sec.id} path={`/${sec.id}`} element={<SectionScreen section={sec} />} />
          ))}
          <Route path="/photos" element={<PhotosScreen />} />
          <Route path="/bilan" element={<BilanScreen />} />
          <Route path="/recap" element={<RecapScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </SheetProvider>
  );
}
