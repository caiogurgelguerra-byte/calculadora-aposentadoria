import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { redefinirSenhaSchema, type RedefinirSenhaForm } from '../../lib/auth/schemas';
import { updatePassword } from '../../lib/auth/mutations';
import { supabase } from '../../lib/supabase/client';

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Limpa sessão local pré-existente para evitar estado misto
    void supabase.auth.signOut({ scope: 'local' });

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    const t = setTimeout(() => {
      if (!ready) setError('Link inválido ou expirado.');
    }, 8000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [ready]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RedefinirSenhaForm>({
    resolver: zodResolver(redefinirSenhaSchema),
  });

  async function onSubmit(form: RedefinirSenhaForm) {
    const result = await updatePassword(form);
    if (result.ok) {
      toast.success('Senha alterada. Faça login com a nova senha.');
      navigate('/login', { replace: true });
      return;
    }
    toast.error('Falha ao alterar senha.');
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">{error}</h1>
        <a href="/recuperar-senha" className="text-blue-600 underline">Solicitar novo link</a>
      </div>
    );
  }

  if (!ready) {
    return <div className="max-w-md mx-auto p-6 text-center">Validando link...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Nova senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">Nova senha</label>
          <input type="password" autoComplete="new-password" {...register('senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-700">Confirmar senha</label>
          <input type="password" autoComplete="new-password" {...register('confirmar_senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.confirmar_senha && <p className="text-xs text-red-600">{errors.confirmar_senha.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : 'Definir nova senha'}
        </button>
      </form>
    </div>
  );
}
