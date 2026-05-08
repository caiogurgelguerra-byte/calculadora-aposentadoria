import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { recuperarSenhaSchema, type RecuperarSenhaForm } from '../../lib/auth/schemas';
import { requestPasswordReset } from '../../lib/auth/mutations';

export function RecuperarSenhaPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecuperarSenhaForm>({
    resolver: zodResolver(recuperarSenhaSchema),
  });

  async function onSubmit(form: RecuperarSenhaForm) {
    const result = await requestPasswordReset(form.email);
    if (result.ok) {
      setSent(true);
      return;
    }
    toast.error('Falha ao enviar email. Tente novamente.');
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Email enviado</h1>
        <p>Se o email estiver cadastrado, você receberá um link para redefinir a senha em instantes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Recuperar senha</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">Email cadastrado</label>
          <input type="email" autoComplete="email" {...register('email')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>
    </div>
  );
}
