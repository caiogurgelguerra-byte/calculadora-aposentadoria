import { POLICY_LAST_UPDATED } from '../../lib/legal/version';

export function PrivacidadePage() {
  return (
    <article className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Política de Privacidade — Seu Mapa Financeiro</h1>
      <p className="text-sm text-gray-500 mb-6"><em>Versão 1 — Última atualização: {POLICY_LAST_UPDATED}</em></p>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Controlador</h2>
      <p className="text-gray-700 mb-4">
        Caio Gurgel Guerra (CPF fornecido a autoridade competente sob solicitação formal) é o
        controlador dos dados pessoais tratados pela plataforma{' '}
        <code>meumapafinanceiro.ia.br</code>. Quando aplicável, o regime societário será atualizado
        neste item (PF autônoma, ME ou LTDA) com CNPJ correspondente.
      </p>
      <p className="text-gray-700 mb-4">
        Encarregado de Proteção de Dados (DPO): o próprio controlador, contato{' '}
        <a href="mailto:caio.gurgel.guerra@gmail.com" className="text-blue-600 underline">
          caio.gurgel.guerra@gmail.com
        </a>. Em caso de <strong>ausência temporária</strong> (férias, afastamento curto), as
        solicitações continuarão a ser recebidas e o prazo de resposta do item 6 conta a partir do
        retorno do controlador, com auto-resposta automática informando o prazo estendido. Para
        incapacidade prolongada, ver item 9.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. Quais dados coletamos e por quê</h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left">Categoria</th>
              <th className="border border-gray-200 px-3 py-2 text-left">Dados</th>
              <th className="border border-gray-200 px-3 py-2 text-left">Finalidade</th>
              <th className="border border-gray-200 px-3 py-2 text-left">Base legal (LGPD Art. 7º)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-3 py-2">Identificação</td>
              <td className="border border-gray-200 px-3 py-2">Nome, data de nascimento, estado civil, dependentes (idades)</td>
              <td className="border border-gray-200 px-3 py-2">Caracterização do cliente, projeções e simulações</td>
              <td className="border border-gray-200 px-3 py-2">V — execução de contrato/tratativas pré-contratuais</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2">Profissional</td>
              <td className="border border-gray-200 px-3 py-2">Profissão, regime de trabalho</td>
              <td className="border border-gray-200 px-3 py-2">Avaliação de renda e benefícios</td>
              <td className="border border-gray-200 px-3 py-2">V — execução de contrato</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2">Localização</td>
              <td className="border border-gray-200 px-3 py-2">Cidade, UF</td>
              <td className="border border-gray-200 px-3 py-2">Custo de vida regional para o plano</td>
              <td className="border border-gray-200 px-3 py-2">V — execução de contrato</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2">Contato</td>
              <td className="border border-gray-200 px-3 py-2">Telefone, email</td>
              <td className="border border-gray-200 px-3 py-2">Comunicação direta sobre o planejamento; envio de emails transacionais</td>
              <td className="border border-gray-200 px-3 py-2">V — execução de contrato; IX — legítimo interesse para email transacional</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2">Acesso</td>
              <td className="border border-gray-200 px-3 py-2">Endereço IP, registros de login</td>
              <td className="border border-gray-200 px-3 py-2">Segurança e auditoria (logs Supabase, retenção ~30 dias)</td>
              <td className="border border-gray-200 px-3 py-2">IX — legítimo interesse em segurança</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-gray-700 mb-2">
        Não usamos cookies não-essenciais (analytics, marketing). Usamos <code>localStorage</code> técnico para:
      </p>
      <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
        <li>Manter sua sessão logada (chaves do Supabase Auth, sob seu controle).</li>
        <li>
          Salvar rascunho do cadastro (chave <code>cadastro_draft_v1</code>) com os dados pessoais
          até o envio bem-sucedido. <strong>Não armazenamos a senha nem o aceite da Política nesta
          chave.</strong> Você pode limpar manualmente em qualquer momento via console do navegador
          ou função "Limpar dados do site".
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. Cadastro restrito a maiores de 18 anos</h2>
      <p className="text-gray-700 mb-4">
        Não tratamos dados de menores de 18 anos nesta fase. Em caso de cadastro de menor (raro pela
        validação técnica), o registro é deletado e o consentimento parental específico (LGPD Art.
        14) terá que ser implementado em fase futura.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Operadores e transferência internacional</h2>
      <p className="text-gray-700 mb-2">
        Compartilhamos dados estritamente com operadores essenciais à operação:
      </p>
      <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
        <li><strong>Supabase Inc.</strong> (US-East) — hospedagem do banco e autenticação. Operador sob LGPD via DPA padrão Supabase aceito pelo controlador.</li>
        <li><strong>Resend, Inc.</strong> (US) — envio de emails transacionais. Operador sob LGPD via DPA padrão Resend aceito pelo controlador.</li>
      </ul>
      <p className="text-gray-700 mb-2">
        Os dois implicam <strong>transferência internacional de dados</strong> para os Estados Unidos (LGPD Art. 33). Base legal aplicada:
      </p>
      <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
        <li><strong>Art. 33, V (principal)</strong> — necessário à execução de contrato ou diligências pré-contratuais a pedido do titular: a hospedagem em Supabase é condição operacional indispensável para criar e manter sua conta; o envio via Resend é condição para você receber confirmações de cadastro e avisos sobre o serviço.</li>
        <li><strong>Art. 33, IX (reforço)</strong> — consentimento específico e em destaque do titular: no cadastro, há checkbox próprio separado do checkbox de aceite geral da Política.</li>
      </ul>
      <p className="text-sm text-gray-500 mb-4">
        <em>Cláusulas contratuais aprovadas pela ANPD (Art. 33, VIII): a ANPD ainda não publicou o
        conjunto definitivo. Quando publicado, os DPAs serão revisados conforme. Hoje, os DPAs
        Supabase/Resend usam cláusulas-padrão SCCs (GDPR), reconhecidas internacionalmente como
        salvaguarda equivalente.</em>
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Armazenamento</h2>
      <p className="text-gray-700 mb-4">
        Servidores com criptografia em repouso (Supabase Postgres) e em trânsito (TLS 1.2+). Senhas
        armazenadas via hash bcrypt pelo Supabase Auth.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">6. Seus direitos (LGPD Art. 18)</h2>
      <p className="text-gray-700 mb-2">Você pode, gratuitamente, solicitar:</p>
      <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
        <li>Confirmação da existência do tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revogação de consentimento.</li>
        <li><strong>Canal eletrônico:</strong>{' '}
          <a href="mailto:caio.gurgel.guerra@gmail.com" className="text-blue-600 underline">
            caio.gurgel.guerra@gmail.com
          </a>{' '}
          (assunto: "LGPD — direito do titular"). Responderemos em até <strong>15 dias úteis</strong>.
        </li>
        <li><strong>Correção dos próprios dados:</strong> disponível diretamente em <strong>Meus dados</strong> após login.</li>
        <li><strong>Exclusão da conta:</strong> disponível em <strong>Meus dados → Excluir minha conta</strong> (a deleção do email/login é completada pelo controlador conforme runbook interno; você recebe confirmação por email).</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">7. Retenção</h2>
      <p className="text-gray-700 mb-2">
        Mantemos seus dados enquanto a relação consultiva estiver ativa. Após encerramento,
        conservamos pelos prazos legais aplicáveis ao regime do controlador, dentre eles:
      </p>
      <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
        <li><strong>Tributário/Fiscal:</strong> prazos do Decreto 70.235/72 e legislação correlata (até 5 anos a partir do exercício seguinte).</li>
        <li><strong>Cobranças/relações de consumo:</strong> prazo prescricional do Código Civil (Art. 206 §5º I — 5 anos para dívidas líquidas) e CDC.</li>
        <li><strong>Obrigações profissionais e regulatórias:</strong> regras legais aplicáveis ao regime de atuação vigente, quando houver.</li>
      </ul>
      <p className="text-gray-700 mb-4">
        <strong>A solicitação de exclusão pelo titular (item 6) prevalece sobre este prazo de
        retenção, exceto quando houver dever legal específico de guarda</strong> — nesses casos,
        comunicaremos a base legal aplicável e o prazo restante.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">8. Incidentes de segurança</h2>
      <p className="text-gray-700 mb-4">
        Em caso de incidente que possa acarretar risco aos titulares, notificaremos a ANPD e os
        titulares afetados, em prazo razoável conforme orientação da ANPD (Resolução CD/ANPD
        nº 15/2024).
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">9. Sucessão</h2>
      <p className="text-gray-700 mb-4">
        Em caso de incapacidade ou falecimento do controlador, a base de dados será preservada
        apenas pelo tempo necessário para encerramento ordenado das relações ativas e exclusão
        segura, em conformidade com a LGPD.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">10. Versionamento</h2>
      <p className="text-gray-700 mb-4">
        Esta política pode ser atualizada. A versão vigente fica em <code>/privacidade</code> com
        data de "Última atualização" no topo. Versões anteriores são preservadas para auditoria —
        solicitar via item 6.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">11. Limites do serviço</h2>
      <p className="text-gray-700 mb-4">
        A consultoria via Seu Mapa Financeiro é <strong>planejamento financeiro pessoal</strong>{' '}
        prestado por Caio Gurgel Guerra.{' '}
        <strong>Não constitui recomendação de produto de investimento (CVM 178/2023)</strong> e não
        substitui assessoria de valores mobiliários. Detalhes em <a href="/termos" className="text-blue-600 underline">Termos de Uso</a>.
      </p>

      <p className="text-sm text-gray-600 mt-8">
        Em caso de dúvidas:{' '}
        <a href="mailto:caio.gurgel.guerra@gmail.com" className="text-blue-600 underline">
          caio.gurgel.guerra@gmail.com
        </a>
      </p>
    </article>
  );
}
