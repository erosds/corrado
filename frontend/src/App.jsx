import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import CaricoDettaglio from './pages/CaricoDettaglio';
import Pagamenti from './pages/Pagamenti';
import Trasportatori from './pages/Trasportatori';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
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
          <Route path="carichi/:id" element={<CaricoDettaglio />} />
          
          {/* Pagamenti */}
          <Route path="pagamenti" element={<Pagamenti />} />
          
          {/* Trasportatori */}
          <Route path="trasportatori" element={<Trasportatori />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;