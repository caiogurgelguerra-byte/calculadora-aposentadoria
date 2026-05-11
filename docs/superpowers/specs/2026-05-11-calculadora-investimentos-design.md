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
- `pre-fixado`;
- `IPCA + taxa`.

Nao havera integracao com ANBIMA nesta versao. Como o usuario nao possui credenciais da API ANBIMA, CDI e IPCA serao campos editaveis. A estrutura de calculo deve ficar isolada o suficiente para permitir preenchimento automatico desses valores no futuro.

Defaults sugeridos:

- CDI anual: valor editavel pre-preenchido e revisado manualmente antes do release;
- IPCA anual: valor editavel pre-preenchido e revisado manualmente antes do release;
- prazo: 12 meses;
- tipo de rentabilidade: `% do CDI`;
- percentual do CDI do investimento principal: 100%;
- aplicacao isenta: desativado.

Os textos auxiliares devem deixar claro que CDI e IPCA sao premissas editaveis, nao dados buscados automaticamente. A poupanca assumira TR igual a zero.

## Comparativos

O investimento informado pelo usuario sera comparado com:

- Poupanca;
- CDB 100% do CDI;
- LCI/LCA 85% do CDI.

Para a poupanca, a calculadora usara o CDI informado como proxy da Selic e considerara TR igual a zero:

- se CDI anual for maior que 8,5%, a poupanca rende 0,5% ao mes;
- se CDI anual for menor ou igual a 8,5%, a poupanca rende 70% do CDI anual, mensalizado.

O CDB 100% do CDI sera sempre tributado pela tabela regressiva de renda fixa. LCI/LCA 85% do CDI e poupanca serao sempre isentas.

## Regras de Calculo

A simulacao sera mensal. Todas as taxas anuais devem ser convertidas para taxas mensais equivalentes antes da simulacao.

Conversao padrao de taxa anual para mensal:

```text
taxaMensal = (1 + taxaAnual)^(1 / 12) - 1
```

As taxas internas devem ser representadas em decimal. Exemplo: 10,65% ao ano vira `0,1065`.

Fluxo de cada mes:

1. iniciar com o saldo acumulado;
2. aplicar o rendimento mensal;
3. adicionar o aporte mensal no fim do mes, se houver;
4. repetir ate o fim do prazo.

Para o investimento principal:

- `% do CDI`: usuario digita `100` para 100% do CDI; fator interno = percentual informado / 100; taxa anual = CDI anual x fator interno;
- `pre-fixado`: taxa anual = taxa informada;
- `IPCA + taxa`: taxa nominal anual estimada = composicao entre IPCA anual e taxa real informada.

Formula de composicao para `IPCA + taxa`:

```text
taxaNominal = (1 + ipcaAnual) * (1 + taxaReal) - 1
```

Todos os percentuais digitados pelo usuario devem ser interpretados como percentuais anuais, exceto o percentual do CDI. Nesse campo, valores como `85`, `100` e `110` significam 85%, 100% e 110% do CDI, respectivamente.

Formula da poupanca:

```text
se cdiAnual > 0,085:
  taxaMensalPoupanca = 0,005
caso contrario:
  taxaMensalPoupanca = (1 + (cdiAnual * 0,70))^(1 / 12) - 1
```

O calculo usa CDI como proxy da Selic apenas para esta simulacao. A interface deve mencionar que TR foi considerada zero.

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
5. aplicar a aliquota regressiva conforme a idade do lote em dias estimados;
6. somar o IR de todos os lotes.

Para converter meses em dias no calculo da tabela regressiva, usar `mesesInvestidos * 30`. Essa aproximacao deve ficar isolada em funcao pura e coberta por testes nos limites de 180, 360 e 720 dias.

## Resultados

A area de resultados deve mostrar:

- card principal com o valor liquido final do investimento escolhido;
- cards secundarios com total investido, rendimento bruto, imposto estimado e rendimento liquido;
- destaque de ganho real estimado quando o tipo escolhido for `IPCA + taxa`;
- grafico de evolucao mes a mes;
- tabela/resumo final dos comparativos.

O grafico comparara a evolucao bruta mes a mes, antes do IR no resgate. O titulo/legenda deve deixar isso claro para evitar que produtos tributados parecam equivalentes ao resultado liquido.

Series do grafico:

- investimento escolhido;
- poupanca;
- CDB 100% CDI;
- LCI/LCA 85% CDI.

A tabela final deve mostrar, para cada alternativa:

- valor bruto final;
- imposto estimado;
- valor liquido final;
- diferenca liquida em relacao ao investimento escolhido.

A ordenacao visual e mensagens de "melhor resultado" devem usar sempre o valor liquido final.

Para `IPCA + taxa`, o destaque de ganho real estimado deve usar:

```text
totalInvestidoCorrigidoIPCA = soma de cada aporte corrigido por IPCA desde o mes do aporte ate o resgate
ganhoRealEstimado = valorLiquidoFinal - totalInvestidoCorrigidoIPCA
```

Essa metrica estima quanto o investimento ficou acima da inflacao no resgate. Como usa IPCA constante informado pelo usuario, ela nao deve ser apresentada como calculo atuarial preciso; o texto deve dizer "ganho real estimado".

## UX e Linguagem

A interface deve seguir o estilo das calculadoras existentes:

- cabecalho em gradiente azul/indigo;
- formulario em card branco lateral;
- resultados em cards e grafico;
- layout responsivo em coluna no mobile e formulario lateral no desktop.

A linguagem deve ser simples e voltada para usuario leigo:

- "quanto voce colocou";
- "quanto rendeu";
- "quanto ficou depois de imposto";
- "qual alternativa terminou com mais dinheiro".

O formulario deve evitar termos tecnicos sem contexto. Quando necessario, textos auxiliares curtos devem explicar CDI, IPCA e isencao.

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

## Estados e Validacao

A calculadora so deve mostrar resultados quando houver dados minimos validos:

- valor inicial maior que zero ou aporte mensal maior que zero;
- prazo maior que zero;
- CDI anual maior ou igual a zero;
- IPCA anual maior que -100%;
- taxa informada valida para o tipo de investimento.

O prazo sera inteiro. Quando o usuario selecionar `anos`, o valor informado tambem deve ser inteiro e sera convertido por `anos * 12`. Se o usuario quiser prazo fracionado, deve usar a opcao `meses`.

As taxas devem ser validadas para impedir valores que tornem a composicao matematica invalida. Exemplo: uma taxa anual menor ou igual a -100% nao e permitida.

Estados invalidos ou incompletos devem mostrar uma area vazia amigavel, seguindo o padrao das calculadoras atuais.

## Testes

Devem ser criados testes unitarios para os calculos puros, cobrindo:

- conversao de taxa anual para mensal;
- parse de percentual do CDI, incluindo `100` como fator `1,0`;
- investimento com aporte no fim do mes;
- calculo de IR regressivo por lote e por prazo;
- investimento isento e nao isento;
- CDB 100% CDI tributado;
- LCI/LCA 85% CDI isenta;
- regra da poupanca com CDI acima e abaixo de 8,5%;
- calculo nominal de `IPCA + taxa`;
- ganho real estimado para `IPCA + taxa`;
- cenarios completos com valor inicial, aportes, prazo, imposto e comparativos;
- limites da tabela de IR em 180, 181, 360, 361, 720 e 721 dias;
- cenarios com taxa zero e sem aporte mensal.

Devem ser criados testes de interface/integracao com React Testing Library cobrindo:

- rota `/investimentos` acessivel;
- card da Home apontando para `/investimentos`;
- estado vazio com dados incompletos;
- preenchimento feliz do formulario exibindo cards, grafico e tabela;
- labels das series do grafico e colunas da tabela;
- diferenca calculada sobre valor liquido final.

Tambem deve ser executado o build do projeto apos a implementacao.

## Fora de Escopo

Esta versao nao inclui:

- integracao com API ANBIMA;
- busca automatica de CDI/IPCA;
- persistencia de simulacoes;
- autenticacao especifica para a calculadora;
- exportacao em PDF;
- compartilhamento de resultado.
