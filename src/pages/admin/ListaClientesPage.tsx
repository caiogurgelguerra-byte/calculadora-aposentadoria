import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { listClients, findDuplicates } from '../../lib/admin/queries';
import { releaseClient, rejectClient } from '../../lib/admin/mutations';
import type { ProfileWithEmail, ClientStatus } from '../../lib/supabase/types';

const STATUSES: (ClientStatus | 'todos')[] = [
  'todos','lead','rejeitado','liberado','em_onboarding','submetido','em_consultoria','concluido',
];

export function ListaClientesPage() {
  const [clients, setClients] = useState<ProfileWithEmail[] | null>(null);
  const [filter, setFilter] = useState<'todos' | ClientStatus>('todos');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function reload() {
    try {
      setClients(await listClients());
    } catch {
      toast.error('Erro ao carregar lista.');
    }
  }
  useEffect(() => { void reload(); }, []);

  const duplicates = useMemo(
    () => clients ? findDuplicates(clients) : new Map(),
    [clients],
  );

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter !== 'todos' && c.status !== filter) return false;
      if (!q) return true;
      return c.nome_completo.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q);
    });
  }, [clients, filter, search]);

  async function handleLiberar(c: ProfileWithEmail) {
    setBusy((b) => ({ ...b, [c.id]: true }));
    const r = await releaseClient(c.id);
    setBusy((b) => ({ ...b, [c.id]: false }));
    if (!r.ok) { toast.error('Falha ao liberar.'); return; }
    if (r.data?.alreadyReleased) {
      toast('Cliente já estava liberado (email pode ter sido enviado anteriormente).');
    } else if (r.data?.emailSent) {
      toast.success('Cliente liberado. Email enviado.');
    } else {
      toast.warning('Cliente liberado, mas o email falhou. Avise por WhatsApp.');
    }
    await reload();
  }

  async function handleRecusar(c: ProfileWithEmail) {
    const motivo = window.prompt(`Recusar ${c.nome_completo}? Motivo (obrigatório):`);
    if (!motivo) return;
    const r = await rejectClient(c.id, motivo);
    toast[r.ok ? 'success' : 'error'](r.ok ? 'Cliente recusado.' : 'Falha ao recusar.');
    await reload();
  }

  if (!clients) return <div className="p-6">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Clientes</h1>
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as ClientStatus | 'todos')}
                className="border border-gray-300 rounded-lg px-3 py-2">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tabela em md+ */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Lista de clientes</caption>
          <thead className="bg-gray-100">
            <tr className="text-left text-sm">
              <th className="p-2">Nome</th><th className="p-2">Email</th>
              <th className="p-2">Status</th><th className="p-2">Cadastrado</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  {c.nome_completo}
                  {(duplicates.get(`tel:${c.telefone}`) || []).length > 1 && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 rounded px-1">
                      possível duplicado
                    </span>
                  )}
                </td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2 text-sm">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-2 space-x-2">
                  {c.status === 'lead' && (
                    <>
                      <button disabled={busy[c.id]} onClick={() => handleLiberar(c)}
                              className="text-green-600 hover:underline disabled:opacity-50">
                        Liberar
                      </button>
                      <button onClick={() => handleRecusar(c)}
                              className="text-red-600 hover:underline">
                        Recusar
                      </button>
                    </>
                  )}
                  <Link to={`/admin/cliente/${c.id}`} className="text-blue-600 hover:underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards em mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="font-semibold">{c.nome_completo}</div>
            <div className="text-sm text-gray-600">{c.email}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">{c.status}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {c.status === 'lead' && (
                <>
                  <button disabled={busy[c.id]} onClick={() => handleLiberar(c)}
                          className="text-green-600 text-sm">Liberar</button>
                  <button onClick={() => handleRecusar(c)}
                          className="text-red-600 text-sm">Recusar</button>
                </>
              )}
              <Link to={`/admin/cliente/${c.id}`} className="text-blue-600 text-sm">Detalhes</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
