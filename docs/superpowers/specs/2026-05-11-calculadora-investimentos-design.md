# Calculadora de Investimentos - Design

## Contexto

O projeto ja possui calculadoras publicas em React/Vite para aposentadoria e salario liquido. A nova calculadora de investimentos deve entrar como uma terceira ferramenta publica, mantendo o padrao atual de pagina com cabecalho, formulario lateral e area de resultados.

O objetivo e permitir que um usuario leigo simule um investimento com valor inicial, aportes mensais opcionais, prazo e tipo de taxa, comparando o resultado com alternativas comuns de renda fixa.

## Escopo

A calculadora sera acessivel em `/investimentos` e tambem aparecera como card na Home.

O formulario deve solicitar:

- valor inicial investido;
- se havera aporte mensal;
- valor do aporte mensal, quando ativado;
- prazo como numero + seletor `meses` ou `anos`;
- CDI anual editavel;
- IPCA anual editavel;
- tipo de rentabilidade do investimento principal;
- taxa do investimento conforme o tipo selecionado;
- se a aplicacao principal e isenta de imposto de renda.

Tipos de rentabilidade suportados:

- `% do CDI`;
- `prefixado`;
- `IPCA + taxa`.

Nao havera integracao com ANBIMA nesta versao. Como o usuario nao possui credenciais da API ANBIMA, CDI e IPCA serao campos editaveis. A estrutura de calculo deve ficar isolada o suficiente para permitir preenchimento automatico desses valores no futuro.

Defaults da versao:

- CDI anual: vazio, com texto de exemplo;
- IPCA anual: vazio, com texto de exemplo;
- prazo: 12 meses;
- tipo de rentabilidade: `% do CDI`;
- percentual do CDI do investimento principal: 100%;
- taxa prefixada: vazia;
- taxa real de `IPCA + taxa`: vazia;
- aplicacao isenta: desativado.

Os textos auxiliares devem deixar claro que CDI e IPCA sao premissas editaveis, nao dados buscados automaticamente. A poupanca assumira TR igual a zero. Como CDI e IPCA comecam vazios, a pagina inicia em estado vazio ate o usuario preencher as premissas minimas.

## Comparativos

O investimento informado pelo usuario sera comparado com:

- Poupanca;
- CDB 100% do CDI;
- LCI/LCA hipotetica 85% do CDI.

Para a poupanca, a calculadora usara o CDI informado como proxy da Selic e considerara TR igual a zero:

- se CDI anual for maior que 8,5%, a poupanca rende 0,5% ao mes;
- se CDI anual for menor ou igual a 8,5%, a poupanca rende 70% do CDI anual, mensalizado.

Como a regra legal da poupanca usa a meta Selic, o comparativo deve ser rotulado como aproximacao: `Poupanca simplificada (CDI como proxy da Selic, TR = 0)`. O campo adicional de Selic fica fora do escopo porque o usuario decidiu que a poupanca deve ser derivada do CDI informado.

O CDB 100% do CDI sera sempre tributado pela tabela regressiva de renda fixa. LCI/LCA hipotetica 85% do CDI e poupanca serao tratadas como isentas para pessoa fisica nesta simulacao.

## Regras de Calculo

A simulacao sera mensal. Todas as taxas anuais devem ser convertidas para taxas mensais equivalentes antes da simulacao.

Conversao padrao de taxa anual para mensal:

```text
taxaMensal = (1 + taxaAnual)^(1 / 12) - 1
```

As taxas internas devem ser representadas em decimal. Exemplo: 10,65% ao ano vira `0,1065`.

Fluxo de cada mes:

1. iniciar no mes `0` com o lote do valor inicial;
2. registrar o ponto do grafico do mes `0` com o valor inicial bruto;
3. para cada mes `m = 1..prazoMeses`, aplicar rendimento de um mes aos lotes existentes;
4. apos o rendimento do mes `m`, criar o aporte mensal do fim do mes, se houver;
5. registrar o ponto do grafico do mes `m` depois do rendimento e depois do aporte;
6. no resgate, usar o estado apos o mes `prazoMeses`.

Com essa convencao, o aporte do ultimo mes entra no total investido e no saldo final, mas nao rende e tem idade zero no resgate. Isso deve ser visivel nos testes e pode ser explicado em texto auxiliar curto quando houver aporte mensal.

Datas da simulacao:

- `dataInicioSimulacao` sera a data atual no uso real, mas a funcao pura de calculo deve aceitar `startDate` injetavel para testes deterministicos;
- `dataResgate = addMonths(dataInicioSimulacao, prazoMeses)`;
- o lote inicial tem `dataAporte = dataInicioSimulacao`;
- o aporte do mes `m` tem `dataAporte = addMonths(dataInicioSimulacao, m)`;
- a idade em meses de um lote no resgate e `prazoMeses - mesAporte`;
- a idade em dias de um lote deve ser calculada por diferenca de dias corridos entre `dataAporte` e `dataResgate`.

`addMonths` deve preservar o dia do mes quando possivel e ajustar para o ultimo dia valido quando o mes de destino tiver menos dias. Exemplo: 31 de janeiro + 1 mes vira o ultimo dia valido de fevereiro.

A area de resultados deve mostrar discretamente a data-base usada na simulacao. O hook e as funcoes puras devem permitir injetar `startDate` para testes; em uso normal, o default e a data local atual.

Para produtos atrelados ao CDI, o percentual deve ser aplicado sobre a taxa mensal equivalente do CDI, nao sobre uma taxa anual ja multiplicada:

```text
cdiMensal = (1 + cdiAnual)^(1 / 12) - 1
taxaMensalProdutoCdi = cdiMensal * (percentualCdi / 100)
```

Para o investimento principal:

- `% do CDI`: usuario digita `100` para 100% do CDI; fator interno = percentual informado / 100; taxa mensal = CDI mensal x fator interno;
- `prefixado`: taxa anual = taxa informada;
- `IPCA + taxa`: taxa nominal anual estimada = composicao entre IPCA anual e taxa real informada.

Formula de composicao para `IPCA + taxa`:

```text
taxaNominal = (1 + ipcaAnual) * (1 + taxaReal) - 1
```

Todos os percentuais digitados pelo usuario devem ser interpretados como percentuais anuais, exceto o percentual do CDI. Nesse campo, valores como `85`, `100` e `110` significam 85%, 100% e 110% do CDI, respectivamente.

Formula da poupanca simplificada:

```text
selicProxyAnual = cdiAnual

se selicProxyAnual > 0,085:
  taxaMensalPoupanca = 0,005
caso contrario:
  taxaMensalPoupanca = (1 + (selicProxyAnual * 0,70))^(1 / 12) - 1
```

O calculo usa CDI como proxy da Selic apenas para esta simulacao. A interface deve mencionar que TR foi considerada zero e que a poupanca real depende da meta Selic, TR e data de aniversario.

Para a poupanca simplificada, a simulacao assume depositos e resgate em datas de aniversario mensal, sem saques intrames. O fluxo de rendimento antes do aporte mensal representa a regra de menor saldo apenas sob essa convencao.

## Imposto de Renda

O imposto sera calculado no resgate final, mas respeitando a idade de cada aporte. Como aportes mensais entram em datas diferentes, cada aporte deve ser tratado como um lote separado.

Tabela regressiva:

- ate 180 dias: 22,5%;
- 181 a 360 dias: 20%;
- 361 a 720 dias: 17,5%;
- acima de 720 dias: 15%.

Regras:

- investimento principal isento: IR igual a zero;
- investimento principal nao isento: aplicar tabela regressiva sobre o rendimento de cada lote;
- CDB 100% CDI: aplicar tabela regressiva sobre o rendimento de cada lote;
- LCI/LCA e poupanca: IR igual a zero.

Se o rendimento for negativo ou zero, o IR sera zero.

Modelo por lote:

1. criar um lote para o valor inicial no mes zero;
2. criar um novo lote para cada aporte mensal no fim do respectivo mes;
3. cada lote rende mensalmente pela mesma taxa do produto;
4. no fim do prazo, calcular o rendimento positivo de cada lote;
5. aplicar a aliquota regressiva conforme a idade do lote em dias corridos;
6. somar o IR de todos os lotes.

Funcoes de IR obrigatorias:

```text
idadeEmDiasDoLote(dataAporte, dataResgate) = diferenca em dias corridos

aliquotaIRPorDias(dias):
  se dias <= 180: 22,5%
  se dias <= 360: 20,0%
  se dias <= 720: 17,5%
  caso contrario: 15,0%
```

A implementacao nao deve usar `mesesInvestidos * 30` para escolher a aliquota. Os testes devem cobrir os limites de 180, 181, 360, 361, 720 e 721 dias, alem de cenarios de 6, 12 e 24 meses com `startDate` fixo.

IOF fica fora do escopo desta versao. A simulacao e mensal, assume resgate em data de aniversario mensal e nao deve prometer precisao para resgates com menos de 30 dias. Se qualquer lote tributavel com rendimento positivo tiver idade menor que 30 dias no resgate, a interface deve exibir aviso nao bloqueante de que o IOF nao foi considerado.

## Resultados

A area de resultados deve mostrar:

- card principal com o valor liquido final do investimento escolhido;
- cards secundarios com total investido, rendimento bruto, imposto estimado e rendimento liquido;
- destaque de ganho real estimado quando o tipo escolhido for `IPCA + taxa`;
- grafico de evolucao mes a mes;
- tabela/resumo final dos comparativos.

Formulas de resultado:

```text
numeroDeAportes = hasMonthlyContribution ? prazoMeses : 0
totalInvestido = valorInicial + (aporteMensal * numeroDeAportes)
valorBrutoFinal = soma dos valores brutos finais dos lotes
imposto = soma do imposto dos lotes tributaveis
valorLiquidoFinal = valorBrutoFinal - imposto
rendimentoBruto = valorBrutoFinal - totalInvestido
rendimentoLiquido = valorLiquidoFinal - totalInvestido
diferencaLiquida = alternativa.valorLiquidoFinal - investimentoEscolhido.valorLiquidoFinal
```

O grafico comparara a evolucao bruta mes a mes, antes do IR no resgate. O titulo, a legenda e o tooltip devem deixar isso claro para evitar que produtos tributados parecam equivalentes ao resultado liquido. No ultimo ponto, o tooltip deve tambem mostrar o valor liquido final estimado quando houver imposto.

Series do grafico:

- investimento escolhido;
- poupanca;
- CDB 100% CDI;
- LCI/LCA hipotetica 85% CDI.

Contrato minimo do grafico:

- tipo: grafico de linha;
- eixo X: mes `0..prazoMeses`;
- eixo Y: saldo bruto em reais;
- mes `0`: valor inicial bruto para todas as series;
- quatro series com IDs estaveis;
- titulo textual fora do SVG;
- legenda compacta e legivel em mobile;
- `data-testid` nos elementos textuais usados por testes, sem depender de paths SVG do Recharts.

A tabela final deve mostrar, para cada alternativa:

- valor bruto final;
- imposto estimado;
- valor liquido final;
- diferenca liquida em relacao ao investimento escolhido.

A tabela deve manter ordem fixa para facilitar leitura e testes: investimento escolhido, poupanca, CDB 100% CDI, LCI/LCA hipotetica 85% CDI. A mensagem ou badge de "melhor resultado" deve usar sempre o maior valor liquido final. Em empate de ate R$ 0,01, mostrar empate; se houver empate visual, preservar a ordem fixa.

Para `IPCA + taxa`, o destaque de ganho real estimado deve usar:

```text
totalInvestidoCorrigidoIPCA = soma de cada aporte corrigido por IPCA pela idade mensal do respectivo lote
ganhoRealEstimado = valorLiquidoFinal - totalInvestidoCorrigidoIPCA
```

O aporte feito no fim do mes so comeca a ser corrigido por IPCA no mes seguinte, usando a mesma idade mensal do lote no resgate. Essa metrica estima quanto o investimento ficou acima da inflacao no resgate. Como usa IPCA constante informado pelo usuario, ela nao deve ser apresentada como calculo atuarial preciso; o texto deve dizer "ganho real estimado".

## UX e Linguagem

A interface deve seguir o estilo das calculadoras existentes:

- cabecalho em gradiente azul/indigo;
- formulario em card branco lateral;
- resultados em cards e grafico;
- layout responsivo em coluna no mobile e formulario lateral no desktop;
- tabela comparativa com rolagem horizontal em telas pequenas;
- grafico com altura minima estavel e legenda compacta no mobile;
- Home ajustada para comportar tres cards, usando grid de uma coluna no mobile e tres colunas no desktop quando houver espaco.

A linguagem deve ser simples e voltada para usuario leigo:

- "quanto voce colocou";
- "quanto rendeu";
- "quanto ficou depois de imposto";
- "qual alternativa terminou com mais dinheiro".

O formulario deve evitar termos tecnicos sem contexto. Quando necessario, textos auxiliares curtos devem explicar CDI, IPCA e isencao.

Avisos curtos proximos aos resultados:

- CDI e IPCA sao premissas informadas pelo usuario;
- poupanca usa CDI como proxy da Selic e TR igual a zero;
- valores sao estimativas e assumem manutencao ate o prazo final;
- a simulacao nao considera marcacao a mercado, spread, taxas, carencia, liquidez, risco de credito, cobertura/limites/elegibilidade do FGC, mudancas futuras de tributacao, come-cotas ou IOF.

Acessibilidade minima:

- todos os campos devem ter `label` real;
- grupos de tipo de rentabilidade e isencao devem usar `fieldset`/`legend` ou semantica equivalente;
- campos invalidos devem usar `aria-invalid` e `aria-describedby`;
- a tabela deve ter `caption`;
- o grafico deve ter titulo textual e resumo textual dos valores finais para leitores de tela.

## Componentes e Organizacao

Seguindo o padrao atual do projeto, a implementacao deve criar modulos semelhantes aos existentes para aposentadoria e salario:

- pagina `InvestimentosPage`;
- arquivo de pagina `src/pages/InvestimentosPage.tsx`;
- rota publica `/investimentos` registrada em `src/App.tsx`;
- card de acesso na Home;
- formulario em `src/calculators/investimentos/InputForm.tsx`;
- componentes de resultado em `src/calculators/investimentos/`;
- tipos em `src/lib/investimentos/types.ts`;
- calculos puros em `src/lib/investimentos/calculations.ts`;
- hook em `src/hooks/investimentos/useInvestimentosCalculations.ts`.

Os calculos principais devem ficar fora dos componentes React para facilitar testes unitarios.

Tipos minimos de dominio:

```ts
type RateType = 'cdi_percent' | 'fixed' | 'ipca_plus'
type TermUnit = 'months' | 'years'
type InvestmentOptionId = 'custom' | 'savings' | 'cdb_100_cdi' | 'lci_lca_85_cdi'
type InvestimentosField =
  | 'initialAmount'
  | 'monthlyContribution'
  | 'termValue'
  | 'cdiAnnualPercent'
  | 'ipcaAnnualPercent'
  | 'cdiPercent'
  | 'fixedAnnualPercent'
  | 'ipcaSpreadAnnualPercent'

interface InvestimentosInputs {
  initialAmount: number
  hasMonthlyContribution: boolean
  monthlyContribution: number
  termValue: number
  termUnit: TermUnit
  cdiAnnualPercent: number | null
  ipcaAnnualPercent: number | null
  rateType: RateType
  cdiPercent: number | null
  fixedAnnualPercent: number | null
  ipcaSpreadAnnualPercent: number | null
  isTaxExempt: boolean
}

interface NormalizedInvestimentosInputs {
  initialAmount: number
  hasMonthlyContribution: boolean
  monthlyContribution: number
  termMonths: number
  cdiAnnualRate: number
  ipcaAnnualRate: number
  rateType: RateType
  cdiFactor: number
  fixedAnnualRate: number
  ipcaSpreadAnnualRate: number
  isTaxExempt: boolean
  startDate: Date
}

interface ComparisonResult {
  id: InvestmentOptionId
  label: string
  grossFinalValue: number
  investedTotal: number
  grossYield: number
  tax: number
  netFinalValue: number
  netYield: number
  netDifferenceFromCustom: number
  isBest: boolean
}

interface SimulationPoint {
  month: number
  customGross: number
  savingsGross: number
  cdb100CdiGross: number
  lciLca85CdiGross: number
}

interface CalculationResult {
  rows: ComparisonResult[]
  simulation: SimulationPoint[]
  bestOptionIds: InvestmentOptionId[]
  realGainEstimate?: number
  baseDate: Date
  warnings: string[]
}

type InvestimentosErrors = Partial<Record<InvestimentosField, string>>
```

Contratos minimos de componentes:

- `InputForm`: recebe `value: InvestimentosInputs`, `onChange(next)`, `errors: InvestimentosErrors`; preserva valores digitados ao alternar tipo de taxa ou desligar aporte mensal;
- `ResultCards`: recebe `CalculationResult` e mostra cards principais;
- `ComparisonChart`: recebe `simulation` e `rows`, renderiza grafico bruto e textos testaveis;
- `ComparisonTable`: recebe `rows` em ordem fixa e mostra valores finais;
- `useInvestimentosCalculations`: aceita `inputs` e opcionalmente `{ startDate?: Date }`, normaliza entradas, valida, chama calculos puros e retorna `{ result, errors }`.

`rows` deve conter os quatro itens em ordem fixa, incluindo o investimento escolhido (`custom`). O card principal usa `rows.find(row => row.id === 'custom')`.

Entradas de UI ficam em percentuais humanos, como `10,65` para 10,65% ao ano. A camada de normalizacao converte percentuais para decimais internos, como `0,1065`, antes de chamar os calculos puros.

## Estados e Validacao

A calculadora so deve mostrar resultados quando houver dados minimos validos:

- valor inicial maior que zero ou aporte mensal maior que zero;
- prazo maior que zero e menor ou igual a 600 meses;
- CDI anual maior ou igual a zero;
- IPCA anual maior que -100%;
- taxa informada valida para o tipo de investimento.

O prazo sera inteiro. Quando o usuario selecionar `anos`, o valor informado tambem deve ser inteiro e sera convertido por `anos * 12`. Se o usuario quiser prazo fracionado, deve usar a opcao `meses`.

As taxas devem ser validadas para impedir valores que tornem a composicao matematica invalida. Exemplo: uma taxa anual menor ou igual a -100% nao e permitida.

Matriz de validacao:

- `initialAmount`: `0 <= valor <= 999.999.999,99`;
- `monthlyContribution`: `0 <= valor <= 999.999.999,99`;
- `hasMonthlyContribution = false`: calculo usa aporte mensal `0`, mas o valor digitado fica preservado no formulario caso o usuario religue o toggle;
- `termValue`: inteiro entre `1` e `600` quando unidade for meses; inteiro entre `1` e `50` quando unidade for anos;
- `cdiAnnualPercent`: obrigatorio, `0 <= valor <= 100`;
- `ipcaAnnualPercent`: obrigatorio, `-99,99 < valor <= 100`;
- `cdiPercent`: obrigatorio para `% do CDI`, `0 <= valor <= 1000`;
- `fixedAnnualPercent`: obrigatorio para `prefixado`, `-99,99 < valor <= 100`;
- `ipcaSpreadAnnualPercent`: obrigatorio para `IPCA + taxa`, `-99,99 < valor <= 100`;
- taxas compostas devem resultar em valor maior que `-100%`.

Parsing e exibicao:

- campos monetarios aceitam formato brasileiro com `.` como separador de milhar e `,` como decimal;
- campos percentuais aceitam `,` ou `.` como separador decimal;
- campo vazio deve ser tratado como incompleto, nao como zero, para CDI/IPCA e taxa ativa;
- moeda deve ser exibida em `pt-BR`, com duas casas decimais;
- percentuais devem ser exibidos com ate duas casas decimais.

Estados invalidos ou incompletos devem mostrar uma area vazia amigavel com texto minimo `Preencha os dados do investimento`. Erros de campos preenchidos invalidamente devem aparecer junto ao campo, com `aria-invalid` e `aria-describedby`. O calculo nao deve rodar enquanto houver erro bloqueante.

O prazo maximo de 600 meses limita a quantidade de pontos e lotes a no maximo 601 por alternativa. O calculo final deve ser linear em relacao ao prazo por produto (`O(n)`), sem loops aninhados por mes e lote para produzir o resultado final. A serie mensal do grafico tambem deve ser limitada a `prazoMeses + 1` pontos.

## Testes

Devem ser criados testes unitarios para os calculos puros, cobrindo:

- conversao de taxa anual para mensal;
- parse de percentual do CDI, incluindo `100` como fator `1,0`;
- aplicacao de `% do CDI` sobre CDI mensal equivalente;
- investimento com aporte no fim do mes;
- convencao do aporte do ultimo mes com rendimento zero;
- calculo de datas de aporte e resgate com `startDate` fixo;
- injecao de `startDate` no hook/normalizador para evitar testes dependentes do relogio real;
- calculo de IR regressivo por lote e por prazo;
- investimento isento e nao isento;
- CDB 100% CDI tributado;
- LCI/LCA 85% CDI isenta;
- regra da poupanca com CDI acima e abaixo de 8,5%;
- calculo nominal de `IPCA + taxa`;
- ganho real estimado para `IPCA + taxa`;
- cenarios completos com valor inicial, aportes, prazo, imposto e comparativos;
- limites da tabela de IR em 180, 181, 360, 361, 720 e 721 dias;
- cenarios de 6, 12 e 24 meses com `startDate` fixo;
- cenarios com taxa zero e sem aporte mensal.

Devem ser criados testes de interface/integracao com React Testing Library cobrindo:

- rota `/investimentos` acessivel;
- card da Home apontando para `/investimentos`;
- estado vazio com dados incompletos;
- preenchimento feliz do formulario exibindo cards, grafico e tabela;
- exibicao da data-base da simulacao;
- labels das series do grafico e colunas da tabela;
- diferenca calculada sobre valor liquido final.

Para testes de rota, usar `window.history.pushState` e renderizar `App`, ou testar a pagina isolada com router wrapper quando o objetivo nao for integracao de rotas. Para testes de grafico com Recharts, nao depender de paths SVG; validar titulo, legenda, resumo textual e tabela. Se necessario, mockar `ResizeObserver` ou dimensoes de `ResponsiveContainer`.

Tambem devem ser executados `npm test` e `npm run build` apos a implementacao.

## Fora de Escopo

Esta versao nao inclui:

- integracao com API ANBIMA;
- busca automatica de CDI/IPCA;
- campo separado de Selic/meta Selic;
- TR real ou busca de TR;
- IOF;
- taxas de corretagem, custodia, administracao ou spreads;
- come-cotas;
- marcacao a mercado;
- carencia, liquidez ou elegibilidade de produto;
- cobertura, limites e elegibilidade do FGC;
- dias uteis, calendario de feriados ou variacao diaria do CDI;
- persistencia de simulacoes;
- autenticacao especifica para a calculadora;
- exportacao em PDF;
- compartilhamento de resultado.
