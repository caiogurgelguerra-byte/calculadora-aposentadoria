import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cadastroSchema, type CadastroForm } from '../../lib/auth/schemas';
import { signUp } from '../../lib/auth/mutations';
import { normalizePhoneToE164 } from '../../components/forms/phone-parser';
import { FormField } from '../../components/forms/FormField';
import { UFSelect } from '../../components/forms/UFSelect';
import { PhoneInput } from '../../components/forms/PhoneInput';
import { DependentesInput } from '../../components/forms/DependentesInput';

const DRAFT_KEY = 'cadastro_draft_v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

interface Draft {
  data: Partial<CadastroForm>;
  savedAt: number;
}

function loadDraft(): Partial<CadastroForm> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: Draft = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveDraft(data: Partial<CadastroForm>) {
  // NUNCA persistir senha, confirmar_senha, aceito_privacidade, aceito_transferencia_internacional
  const { senha, confirmar_senha, aceito_privacidade, aceito_transferencia_internacional, website, ...safe } = data;
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: safe, savedAt: Date.now() } satisfies Draft));
}

export function CadastroPage() {
  const navigate = useNavigate();
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const draft = loadDraft();
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { dependentes: [], ...draft } as Partial<CadastroForm>,
  });

  // Auto-focus no h1
  useEffect(() => { h1Ref.current?.focus(); }, []);

  // Auto-save draft (debounce 500ms)
  const watched = watch();
  useEffect(() => {
    const t = setTimeout(() => saveDraft(watched), 500);
    return () => clearTimeout(t);
  }, [watched]);

  async function onSubmit(form: CadastroForm) {
    // Normaliza telefone antes
    const tel = normalizePhoneToE164(form.telefone);
    if (!tel) {
      toast.error('Telefone inválido. Use formato +55DDXXXXXXXXX.');
      return;
    }
    const result = await signUp({ ...form, telefone: tel });
    if (result.ok) {
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/confirme-email?email=${encodeURIComponent(form.email)}`);
      return;
    }
    if (result.reason === 'duplicate') {
      toast.error('Este email já está cadastrado. Faça login ou recupere sua senha.');
      return;
    }
    if (result.reason === 'honeypot') {
      window.location.href = '/'; // rejeição silenciosa
      return;
    }
    toast.error('Erro ao cadastrar. Tente novamente em instantes.');
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-semibold mb-6">
        Cadastro - Consultoria
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
        {/* Honeypot off-screen */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          {...register('website')}
        />

        <FormField label="Nome completo" tooltip="Como aparece no seu RG/CNH" error={errors.nome_completo?.message}>
          {({ inputId, errorId }) => (
            <input id={inputId} aria-describedby={errors.nome_completo ? errorId : undefined}
                   {...register('nome_completo')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          )}
        </FormField>

        <FormField label="Data de nascimento"
                   tooltip="Cadastro disponível para maiores de 18 anos."
                   error={errors.data_nascimento?.message}>
          {({ inputId, errorId }) => (
            <input id={inputId} type="date"
                   aria-describedby={errors.data_nascimento ? errorId : undefined}
                   {...register('data_nascimento')}
                   className="border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Estado civil" tooltip="Influencia proteção patrimonial" error={errors.estado_civil?.message}>
          {({ inputId }) => (
            <select id={inputId} {...register('estado_civil')}
                    className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="uniao_estavel">União estável</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
          )}
        </FormField>

        <FormField label="Dependentes (idades)"
                   tooltip="Adicione filhos ou outros dependentes financeiros"
                   error={errors.dependentes?.message}>
          {() => (
            <Controller name="dependentes" control={control}
                        render={({ field }) => (
                          <DependentesInput value={field.value || []} onChange={field.onChange} />
                        )} />
          )}
        </FormField>

        <FormField label="Profissão" tooltip="Sua atividade principal" error={errors.profissao?.message}>
          {({ inputId }) => (
            <input id={inputId} {...register('profissao')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Regime de trabalho" error={errors.regime_trabalho?.message}>
          {({ inputId }) => (
            <select id={inputId} {...register('regime_trabalho')}
                    className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Selecione</option>
              <option value="clt">CLT</option>
              <option value="pj">PJ</option>
              <option value="autonomo">Autônomo</option>
              <option value="servidor_publico">Servidor público</option>
              <option value="empresario">Empresário</option>
              <option value="aposentado">Aposentado</option>
              <option value="outro">Outro</option>
            </select>
          )}
        </FormField>

        <div className="flex gap-2">
          <FormField label="Cidade" tooltip="Influencia custo de vida" error={errors.cidade?.message}>
            {({ inputId }) => (
              <input id={inputId} {...register('cidade')}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            )}
          </FormField>
          <FormField label="UF" error={errors.uf?.message}>
            {({ inputId }) => <UFSelect id={inputId} {...register('uf')} />}
          </FormField>
        </div>

        <FormField label="Telefone" tooltip="Apenas números brasileiros" error={errors.telefone?.message}>
          {({ inputId }) => (
            <PhoneInput id={inputId} {...register('telefone')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Email" tooltip="Será seu login. Cuidado com typos." error={errors.email?.message}>
          {({ inputId }) => (
            <input id={inputId} type="email" autoComplete="email" {...register('email')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Senha" tooltip="Mínimo 8 caracteres" error={errors.senha?.message}>
          {({ inputId }) => (
            <input id={inputId} type="password" autoComplete="new-password" {...register('senha')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Confirmar senha" error={errors.confirmar_senha?.message}>
          {({ inputId }) => (
            <input id={inputId} type="password" autoComplete="new-password" {...register('confirmar_senha')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <label className="flex items-start gap-2 mt-4">
          <input type="checkbox" {...register('aceito_privacidade')} />
          <span className="text-sm text-gray-700">
            Aceito a{' '}
            <Link to="/privacidade" target="_blank" className="text-blue-600 underline">
              Política de Privacidade
            </Link>
          </span>
        </label>
        {errors.aceito_privacidade && (
          <p className="text-xs text-red-600">{errors.aceito_privacidade.message}</p>
        )}

        <label className="flex items-start gap-2">
          <input type="checkbox" {...register('aceito_transferencia_internacional')} />
          <span className="text-sm text-gray-700">
            Concordo com a transferência dos meus dados para Estados Unidos (Supabase, Resend),
            conforme item 4 da Política de Privacidade.
          </span>
        </label>
        {errors.aceito_transferencia_internacional && (
          <p className="text-xs text-red-600">{errors.aceito_transferencia_internacional.message}</p>
        )}

        <button type="submit" disabled={isSubmitting}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
