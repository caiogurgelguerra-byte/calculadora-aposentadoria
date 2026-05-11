import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthLayout } from './components/AuthLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import PublicLayout from './components/PublicLayout'
import { RequireAdmin } from './components/RequireAdmin'
import { RequireAuth } from './components/RequireAuth'
import { RequireClient } from './components/RequireClient'
import { RequireGuest } from './components/RequireGuest'

const Home = lazy(() => import('./pages/Home'))
const AposentadoriaPage = lazy(() => import('./pages/AposentadoriaPage'))
const InvestimentosPage = lazy(() => import('./pages/InvestimentosPage'))
const SalarioPage = lazy(() => import('./pages/SalarioPage'))

const CadastroPage = lazy(() =>
  import('./pages/auth/CadastroPage').then((module) => ({ default: module.CadastroPage }))
)
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage }))
)
const RecuperarSenhaPage = lazy(() =>
  import('./pages/auth/RecuperarSenhaPage').then((module) => ({ default: module.RecuperarSenhaPage }))
)
const RedefinirSenhaPage = lazy(() =>
  import('./pages/auth/RedefinirSenhaPage').then((module) => ({ default: module.RedefinirSenhaPage }))
)
const ConfirmeEmailPage = lazy(() =>
  import('./pages/auth/ConfirmeEmailPage').then((module) => ({ default: module.ConfirmeEmailPage }))
)
const PrivacidadePage = lazy(() =>
  import('./pages/auth/PrivacidadePage').then((module) => ({ default: module.PrivacidadePage }))
)
const TermosPage = lazy(() =>
  import('./pages/auth/TermosPage').then((module) => ({ default: module.TermosPage }))
)

const ContaExcluidaPage = lazy(() =>
  import('./pages/cliente/ContaExcluidaPage').then((module) => ({ default: module.ContaExcluidaPage }))
)
const AguardandoPage = lazy(() =>
  import('./pages/cliente/AguardandoPage').then((module) => ({ default: module.AguardandoPage }))
)
const LiberadoPage = lazy(() =>
  import('./pages/cliente/LiberadoPage').then((module) => ({ default: module.LiberadoPage }))
)
const MeusDadosPage = lazy(() =>
  import('./pages/cliente/MeusDadosPage').then((module) => ({ default: module.MeusDadosPage }))
)

const ListaClientesPage = lazy(() =>
  import('./pages/admin/ListaClientesPage').then((module) => ({ default: module.ListaClientesPage }))
)
const DetalheClientePage = lazy(() =>
  import('./pages/admin/DetalheClientePage').then((module) => ({ default: module.DetalheClientePage }))
)

function RouteFallback() {
  return <FullScreenSpinner />
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/aposentadoria" element={<AposentadoriaPage />} />
              <Route path="/investimentos" element={<InvestimentosPage />} />
              <Route path="/salario" element={<SalarioPage />} />
              <Route path="/privacidade" element={<PrivacidadePage />} />
              <Route path="/termos" element={<TermosPage />} />
              <Route path="/conta-excluida" element={<ContaExcluidaPage />} />
              <Route
                path="/cadastro"
                element={
                  <RequireGuest>
                    <CadastroPage />
                  </RequireGuest>
                }
              />
              <Route
                path="/login"
                element={
                  <RequireGuest>
                    <LoginPage />
                  </RequireGuest>
                }
              />
              <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
              <Route path="/confirme-email" element={<ConfirmeEmailPage />} />
            </Route>

            <Route
              element={
                <RequireAuth>
                  <RequireClient>
                    <AuthLayout />
                  </RequireClient>
                </RequireAuth>
              }
            >
              <Route path="/aguardando" element={<AguardandoPage />} />
              <Route path="/liberado" element={<LiberadoPage />} />
              <Route path="/meus-dados" element={<MeusDadosPage />} />
            </Route>

            <Route
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AuthLayout />
                  </RequireAdmin>
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<ListaClientesPage />} />
              <Route path="/admin/cliente/:id" element={<DetalheClientePage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
