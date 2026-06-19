// Router applicatif (HashRouter pour fonctionner dans la WebView Android sans serveur).

import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { SheetProvider } from './lib/store';
import { SECTIONS } from './data/sections';
import { HomeScreen } from './screens/HomeScreen';
import { IdentificationScreen } from './screens/IdentificationScreen';
import { PhotosScreen } from './screens/PhotosScreen';
import { BilanScreen } from './screens/BilanScreen';
import { RecapScreen } from './screens/RecapScreen';
import { SectionScreen } from './components/SectionScreen';

export default function App() {
  return (
    <SheetProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
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
