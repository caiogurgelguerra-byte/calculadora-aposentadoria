import { TERMS_LAST_UPDATED } from '../../lib/legal/version';

export function TermosPage() {
  return (
    <article className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Termos de Uso — Meu Mapa Financeiro</h1>
      <p className="text-sm text-gray-500 mb-6"><em>Versão 1 — Última atualização: {TERMS_LAST_UPDATED}</em></p>
      <p className="text-gray-700 mb-4">
        <strong>Atenção:</strong> esta versão é provisória e está em revisão jurídica. O texto final
        com escopo do serviço, foro, limitação de responsabilidade e disclaimer da CVM 178/2023
        será publicado antes do go-live.
      </p>
      <p className="text-gray-700">
        Em caso de dúvidas, fale comigo:{' '}
        <a href="mailto:caio.gurgel.guerra@gmail.com" className="text-blue-600 underline">
          caio.gurgel.guerra@gmail.com
        </a>.
      </p>
    </article>
  );
}
