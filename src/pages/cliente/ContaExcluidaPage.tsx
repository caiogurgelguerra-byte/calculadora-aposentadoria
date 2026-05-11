import { whatsappUrl } from '../../lib/contact/whatsapp';

export function ContaExcluidaPage() {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 tabIndex={-1} className="text-2xl font-semibold mb-4">Sua conta foi excluída.</h1>
      <p className="text-gray-700 mb-2">
        Sua conta e seus dados foram removidos agora. Você receberá e-mail de confirmação
        em até 15 dias úteis (LGPD Art. 18 §6).
      </p>
      <p className="text-sm text-gray-600 mt-6">
        Em caso de dúvida,{' '}
        <a href={whatsappUrl('conta_excluida')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">
          fale comigo no WhatsApp
        </a>.
      </p>
    </div>
  );
}
