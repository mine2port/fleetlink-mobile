// Router applicatif FleetLink (HashRouter pour fonctionner dans la WebView Android sans serveur).
// Lot 122 : ajout des 4 nouveaux écrans agent terrain (EDL List / Carte Pro / Planning / Compte)
// + bottom-nav 5 onglets sur tous les écrans principaux

import { useEffect } from 'react';
import { HashRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { SheetProvider } from './lib/store';
import { SECTIONS } from './data/sections';
import { HomeScreen } from './screens/HomeScreen';
import { EDLListScreen } from './screens/EDLListScreen';
import { ProCardScreen } from './screens/ProCardScreen';
import { PlanningScreen } from './screens/PlanningScreen';
import { AccountScreen } from './screens/AccountScreen';
import { InspectionScreen } from './screens/InspectionScreen';
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
          {/* Navigation principale (bottom-nav 5 onglets) */}
          <Route path="/" element={<HomeScreen />} />
          <Route path="/edl-list" element={<EDLListScreen />} />
          <Route path="/planning" element={<PlanningScreen />} />
          <Route path="/carte" element={<ProCardScreen />} />
          <Route path="/compte" element={<AccountScreen />} />

          {/* Auth */}
          <Route path="/login" element={<LoginRoute />} />

          {/* EDL assigné EN LIGNE (Slice S6 — /me/inspections/:id) */}
          <Route path="/inspection/:id" element={<InspectionScreen />} />

          {/* Wizard EDL DÉPART/RETOUR */}
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
