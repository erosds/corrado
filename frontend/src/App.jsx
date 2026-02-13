import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Clienti from './pages/Clienti';
import ClienteDettaglio from './pages/ClienteDettaglio';
import Ordini from './pages/Ordini';
import OrdineNuovo from './pages/OrdineNuovo';
import OrdineDettaglio from './pages/OrdineDettaglio';
import Mulini from './pages/Mulini';
import MulinoDettaglio from './pages/MulinoDettaglio';
import Carichi from './pages/Carichi';
import Pagamenti from './pages/Pagamenti';
import Trasportatori from './pages/Trasportatori';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
