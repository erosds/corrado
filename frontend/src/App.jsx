import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Clienti = lazy(() => import('./pages/Clienti'));
const ClienteDettaglio = lazy(() => import('./pages/ClienteDettaglio'));
const Ordini = lazy(() => import('./pages/Ordini'));
const OrdineNuovo = lazy(() => import('./pages/OrdineNuovo'));
const OrdineDettaglio = lazy(() => import('./pages/OrdineDettaglio'));
const Mulini = lazy(() => import('./pages/Mulini'));
const MulinoDettaglio = lazy(() => import('./pages/MulinoDettaglio'));
const Carichi = lazy(() => import('./pages/Carichi'));
const Pagamenti = lazy(() => import('./pages/Pagamenti'));
const Trasportatori = lazy(() => import('./pages/Trasportatori'));
const Login = lazy(() => import('./pages/Login'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />

            {/* Clienti */}
            <Route path="clienti" element={<Clienti />} />
            <Route path="clienti/:id" element={<ClienteDettaglio />} />

            {/* Ordini */}
            <Route path="ordini" element={<Ordini />} />
            <Route path="ordini/nuovo" element={<OrdineNuovo />} />
            <Route path="ordini/:id" element={<OrdineDettaglio />} />
            <Route path="ordini/:id/modifica" element={<OrdineNuovo />} />

            {/* Mulini */}
            <Route path="mulini" element={<Mulini />} />
            <Route path="mulini/:id" element={<MulinoDettaglio />} />

            {/* Carichi */}
            <Route path="carichi" element={<Carichi />} />

            {/* Pagamenti */}
            <Route path="pagamenti" element={<Pagamenti />} />

            {/* Trasportatori */}
            <Route path="trasportatori" element={<Trasportatori />} />
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
