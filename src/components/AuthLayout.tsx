import { Outlet, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { signOut } from '../lib/auth/mutations';
import { useProfile } from '../hooks/auth/useProfile';
import { Footer } from './Footer';

export function AuthLayout() {
  const navigate = useNavigate();
  const profile = useProfile();
  const email = profile.status === 'ready' ? profile.profile.nome_completo : '';

  async function handleLogout() {
    await signOut();
    toast.info('Você foi desconectado de todos os dispositivos.');
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-semibold text-lg">Seu Mapa Financeiro</Link>
          <div className="flex items-center gap-4 text-white text-sm">
            {email && <span>{email}</span>}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
