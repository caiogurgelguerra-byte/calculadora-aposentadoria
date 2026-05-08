import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClientById } from '../../lib/admin/queries';
import type { ProfileWithEmail } from '../../lib/supabase/types';

export function DetalheClientePage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<ProfileWithEmail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getClientById(id).then((data) => { setC(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!c) return <div className="p-6">Cliente não encontrado.</div>;

  function calcIdade(dateStr: string): number {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/admin" className="text-blue-600 underline mb-4 inline-block">← Voltar</Link>
      <h1 className="text-2xl font-semibold mb-6">{c.nome_completo}</h1>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Identificação</h2>
        <p>Email: {c.email}</p>
        <p>Telefone: {c.telefone}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Dados pessoais</h2>
        <p>Data nascimento: {new Date(c.data_nascimento).toLocaleDateString('pt-BR')} ({calcIdade(c.data_nascimento)} anos)</p>
        <p>Estado civil: {c.estado_civil}</p>
        <p>Dependentes: {c.dependentes.length === 0 ? 'nenhum' : c.dependentes.join(', ')}</p>
        <p>Profissão: {c.profissao}</p>
        <p>Regime: {c.regime_trabalho}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="font-semibold mb-2">Endereço</h2>
        <p>{c.cidade} / {c.uf}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="font-semibold mb-2">Status</h2>
        <p>Status: <strong>{c.status}</strong></p>
        {c.motivo_rejeicao && <p>Motivo: {c.motivo_rejeicao}</p>}
        <p>Cadastrado em: {new Date(c.created_at).toLocaleString('pt-BR')}</p>
        <p>Última atividade: {c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleString('pt-BR') : '—'}</p>
      </section>
    </div>
  );
}
