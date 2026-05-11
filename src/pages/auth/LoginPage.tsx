import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema, type LoginForm } from '../../lib/auth/schemas';
import { signIn, resendConfirmation } from '../../lib/auth/mutations';
import { safeNext } from '../../lib/auth/safe-next';
import { useProfile } from '../../hooks/auth/useProfile';
import { smartRedirect } from '../../components/RequireGuest';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = useProfile();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues: _getValues } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => { h1Ref.current?.focus(); }, []);

  async function onSubmit(form: LoginForm) {
    const result = await signIn(form.email, form.senha);
    if (!result.ok) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('confirm')) {
        toast.error('Confirme seu e-mail antes de fazer login.', {
          action: {
            label: 'Reenviar e-mail',
            onClick: async () => {
              const r = await resendConfirmation(form.email);
              toast[r.ok ? 'success' : 'error'](r.ok ? 'E-mail reenviado.' : 'Falha ao reenviar.');
            },
          },
        });
      } else {
        toast.error('E-mail ou senha incorretos.');
      }
      return;
    }
    // Aguarda profile resolver e redireciona
    const next = safeNext(searchParams.get('next'));
    const target = profile.status === 'ready' ? smartRedirect(profile) : next;
    navigate(target, { replace: true });
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-6">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm text-gray-700">E-mail</label>
          <input type="email" autoComplete="email" {...register('email')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm text-gray-700">Senha</label>
          <input type="password" autoComplete="current-password" {...register('senha')}
                 className="w-full border rounded-lg px-3 py-2" />
          {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/recuperar-senha" className="text-blue-600 hover:underline">Esqueci minha senha</Link>
        <Link to="/cadastro" className="text-blue-600 hover:underline">Criar conta</Link>
      </div>
    </div>
  );
}
