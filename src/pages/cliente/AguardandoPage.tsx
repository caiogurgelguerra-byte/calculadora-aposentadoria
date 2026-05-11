import { Link } from 'react-router-dom';
import { useProfile } from '../../hooks/auth/useProfile';
import { whatsappUrl } from '../../lib/contact/whatsapp';

export function AguardandoPage() {
  const profile = useProfile();
  if (profile.status !== 'ready') return null;

  const createdAt = new Date(profile.profile.created_at);
  const days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const showWarning = days > 3;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Você está na fila!</h1>
      <p className="mb-4">
        Recebemos seu cadastro. Para garantir um atendimento de qualidade, eu (Caio Gurgel)
        reviso pessoalmente cada cliente antes de liberar o onboarding.
      </p>
      <p className="mb-4">
        Vou revisar nos próximos dias úteis e te aviso por email quando o acesso estiver liberado.
      </p>
      <p className="mb-6">
        Se tiver dúvidas, fale comigo no{' '}
        <a href={whatsappUrl('aguardando', { nome: profile.profile.nome_completo })}
           target="_blank" rel="noreferrer" className="text-blue-600 underline">
          WhatsApp
        </a>.
      </p>
      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          ⚠ Faz mais tempo do que o esperado. Por favor,{' '}
          <a href={whatsappUrl('aguardando', { nome: profile.profile.nome_completo })}
             target="_blank" rel="noreferrer" className="text-blue-700 underline">
            fale comigo no WhatsApp
          </a>{' '}para conferirmos.
        </div>
      )}
      <Link to="/meus-dados" className="text-blue-600 underline">Corrigir meus dados</Link>
    </div>
  );
}
