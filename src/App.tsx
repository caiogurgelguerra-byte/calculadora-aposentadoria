import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import PublicLayout from './components/PublicLayout';
import { AuthLayout } from './components/AuthLayout';
import { RequireAuth } from './components/RequireAuth';
import { RequireGuest } from './components/RequireGuest';
import { RequireClient } from './components/RequireClient';
import { RequireAdmin } from './components/RequireAdmin';

import Home from './pages/Home';
import AposentadoriaPage from './pages/AposentadoriaPage';
import SalarioPage from './pages/SalarioPage';

import { CadastroPage } from './pages/auth/CadastroPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RecuperarSenhaPage } from './pages/auth/RecuperarSenhaPage';
import { RedefinirSenhaPage } from './pages/auth/RedefinirSenhaPage';
import { ConfirmeEmailPage } from './pages/auth/ConfirmeEmailPage';
import { PrivacidadePage } from './pages/auth/PrivacidadePage';
import { TermosPage } from './pages/auth/TermosPage';
import { ContaExcluidaPage } from './pages/cliente/ContaExcluidaPage';

import { AguardandoPage } from './pages/cliente/AguardandoPage';
import { LiberadoPage } from './pages/cliente/LiberadoPage';
import { MeusDadosPage } from './pages/cliente/MeusDadosPage';

import { ListaClientesPage } from './pages/admin/ListaClientesPage';
import { DetalheClientePage } from './pages/admin/DetalheClientePage';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Públicas + Auth (PublicLayout) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/aposentadoria" element={<AposentadoriaPage />} />
            <Route path="/salario" element={<SalarioPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/conta-excluida" element={<ContaExcluidaPage />} />

            <Route path="/cadastro" element={<RequireGuest><CadastroPage /></RequireGuest>} />
            <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="/confirme-email" element={<ConfirmeEmailPage />} />
          </Route>

          {/* Cliente autenticado */}
          <Route element={<RequireAuth><RequireClient><AuthLayout /></RequireClient></RequireAuth>}>
            <Route path="/aguardando" element={<AguardandoPage />} />
            <Route path="/liberado" element={<LiberadoPage />} />
            <Route path="/meus-dados" element={<MeusDadosPage />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireAuth><RequireAdmin><AuthLayout /></RequireAdmin></RequireAuth>}>
            <Route path="/admin" element={<ListaClientesPage />} />
            <Route path="/admin/cliente/:id" element={<DetalheClientePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
