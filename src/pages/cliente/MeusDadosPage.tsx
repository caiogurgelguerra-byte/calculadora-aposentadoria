import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { meusDadosSchema, type MeusDadosForm } from '../../lib/auth/schemas';
import { updateOwnProfile, deleteOwnAccount } from '../../lib/auth/mutations';
import { useProfile } from '../../hooks/auth/useProfile';
import { normalizePhoneToE164 } from '../../components/forms/phone-parser';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormField } from '../../components/forms/FormField';
import { UFSelect } from '../../components/forms/UFSelect';
import { PhoneInput } from '../../components/forms/PhoneInput';
import { DependentesInput } from '../../components/forms/DependentesInput';
import type { Profile } from '../../lib/supabase/types';

interface FormProps {
  profile: Profile;
  refetch: () => void;
}

function MeusDadosForm({ profile, refetch }: FormProps) {
  const navigate = useNavigate();
  const [step1Open, setStep1Open] = useState(false);
  const [step2Open, setStep2Open] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<MeusDadosForm>({
    resolver: zodResolver(meusDadosSchema),
    defaultValues: {
      ...profile,
      data_nascimento: new Date(profile.data_nascimento),
    } as Partial<MeusDadosForm>,
  });

  async function onSubmit(form: MeusDadosForm) {
    const tel = normalizePhoneToE164(form.telefone);
    if (!tel) {
      toast.error('Telefone inválido.');
      return;
    }
    const result = await updateOwnProfile(profile.id, { ...form, telefone: tel });
    if (result.ok) {
      toast.success('Dados atualizados.');
      refetch();
    } else {
      toast.error('Falha ao atualizar.');
    }
  }

  async function handleDelete() {
    setStep2Open(false);
    const r = await deleteOwnAccount();
    if (r.ok) {
      navigate('/conta-excluida', { replace: true });
      return;
    }
    if (r.reason === 'last_admin') {
      toast.error('Não é possível excluir o último admin.');
      return;
    }
    toast.error('Erro ao excluir conta. Tente novamente.');
  }

  const backTo = profile.status === 'lead' || profile.status === 'rejeitado'
    ? '/aguardando' : '/liberado';

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Meus dados</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">

        <FormField label="Nome completo" error={errors.nome_completo?.message}>
          {({ inputId }) => (
            <input id={inputId} {...register('nome_completo')}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          )}
        </FormField>

        <FormField label="Data de nascimento" error={errors.data_nascimento?.message}>
          {({ inputId }) => (
            <input id={inputId} type="date" {...register('data_nascimento')}
                   className="border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <FormField label="Estado civil" error={errors.estado_civil?.message}>
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

        <FormField label="Dependentes (idades)" error={errors.dependentes?.message}>
          {() => (
            <Controller name="dependentes" control={control}
                        render={({ field }) => (
                          <DependentesInput value={field.value || []} onChange={field.onChange} />
                        )} />
          )}
        </FormField>

        <FormField label="Profissão" error={errors.profissao?.message}>
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
          <FormField label="Cidade" error={errors.cidade?.message}>
            {({ inputId }) => (
              <input id={inputId} {...register('cidade')}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            )}
          </FormField>
          <FormField label="UF" error={errors.uf?.message}>
            {({ inputId }) => <UFSelect id={inputId} {...register('uf')} />}
          </FormField>
        </div>

        <FormField label="Telefone" error={errors.telefone?.message}>
          {({ inputId }) => (
            <PhoneInput id={inputId} {...register('telefone')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          )}
        </FormField>

        <button type="submit" disabled={isSubmitting}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
        <Link to={backTo} className="block text-center mt-2 text-blue-600 underline">Voltar</Link>
      </form>

      <hr className="my-8" />
      <button
        type="button"
        onClick={() => setStep1Open(true)}
        className="text-red-600 hover:underline"
      >
        Excluir minha conta
      </button>

      <ConfirmDialog
        open={step1Open}
        onClose={() => setStep1Open(false)}
        onConfirm={() => { setStep1Open(false); setStep2Open(true); setConfirmText(''); }}
        title="Excluir minha conta"
        description={
          <p>
            Esta ação é irreversível. Excluiremos seu cadastro agora. Você receberá e-mail
            de confirmação em até 15 dias úteis (LGPD Art. 18 §6).
          </p>
        }
        confirmLabel="Continuar"
        destructive
      />
      <ConfirmDialog
        open={step2Open}
        onClose={() => setStep2Open(false)}
        onConfirm={handleDelete}
        title="Confirmação final"
        description={<p>Digite <strong>EXCLUIR</strong> para confirmar a exclusão definitiva.</p>}
        confirmLabel="Excluir"
        destructive
        confirmDisabled={confirmText !== 'EXCLUIR'}
      >
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="EXCLUIR"
        />
      </ConfirmDialog>
    </div>
  );
}

export function MeusDadosPage() {
  const profile = useProfile();
  if (profile.status !== 'ready') return null;
  return <MeusDadosForm profile={profile.profile} refetch={profile.refetch} />;
}
