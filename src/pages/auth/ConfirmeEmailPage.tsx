import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resendConfirmation } from '../../lib/auth/mutations';
import { whatsappUrl } from '../../lib/contact/whatsapp';

const COOLDOWN_S = 60;

export function ConfirmeEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => { h1Ref.current?.focus(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    const result = await resendConfirmation(email);
    if (result.ok) {
      toast.success('Email reenviado. Verifique sua caixa de entrada.');
      setCooldown(COOLDOWN_S);
      return;
    }
    const status = (result.error as { status?: number }).status;
    if (status === 429) {
      toast.error('Muitos pedidos. Aguarde alguns minutos e tente de novo.');
      setCooldown(COOLDOWN_S);
      return;
    }
    toast.error('Falha ao reenviar email.');
  }

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-4">Confirme seu email</h1>
      <p className="text-gray-700 mb-2">
        Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.
      </p>
      <p className="text-sm text-gray-600 mb-6">Não recebeu? Verifique a caixa de spam.</p>
      <button
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {cooldown > 0 ? `Reenviar em ${cooldown}s...` : 'Reenviar email de confirmação'}
      </button>
      <p className="text-sm text-gray-600 mt-6">
        Errou o email?{' '}
        <a href={whatsappUrl('email_errado')} target="_blank" rel="noreferrer"
           className="text-blue-600 underline">
          Fale comigo no WhatsApp
        </a>{' '}
        que eu corrijo manualmente.
      </p>
    </div>
  );
}
