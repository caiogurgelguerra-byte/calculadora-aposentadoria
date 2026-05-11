import { Link } from 'react-router-dom';
import { useProfile } from '../../hooks/auth/useProfile';
import { whatsappUrl } from '../../lib/contact/whatsapp';

export function LiberadoPage() {
  const profile = useProfile();
  if (profile.status !== 'ready') return null;
  const dataLib = new Date(profile.profile.updated_at).toLocaleDateString('pt-BR');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Acesso liberado em {dataLib}!</h1>
      <p className="mb-4">
        Em breve você poderá preencher os dados do seu planejamento aqui.
      </p>
      <p className="mb-6">
        Vou entrar em contato em breve via WhatsApp ou e-mail para combinarmos os próximos passos.
        Se preferir, me chame:{' '}
        <a href={whatsappUrl('liberado')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">WhatsApp</a>.
      </p>
      <Link to="/meus-dados" className="text-blue-600 underline">Corrigir meus dados</Link>
    </div>
  );
}
