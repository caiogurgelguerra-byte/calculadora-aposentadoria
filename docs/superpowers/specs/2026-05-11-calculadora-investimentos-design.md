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

Fluxo de cada mes:

1. iniciar com o saldo acumulado;
2. aplicar o rendimento mensal;
3. adicionar o aporte mensal no fim do mes, se houver;
4. repetir ate o fim do prazo.

Para o investimento principal:

- `% do CDI`: taxa anual = CDI anual x percentual informado;
- `pre-fixado`: taxa anual = taxa informada;
- `IPCA + taxa`: taxa nominal anual estimada = composicao entre IPCA anual e taxa real informada.

Formula de composicao para `IPCA + taxa`:

```text
taxaNominal = (1 + ipcaAnual) * (1 + taxaReal) - 1
```

Todos os percentuais digitados pelo usuario devem ser interpretados como percentuais anuais, exceto o percentual do CDI, que representa a proporcao do CDI anual.

## Imposto de Renda

O imposto sera calculado apenas no resgate final, sobre o rendimento positivo.

Tabela regressiva:

- ate 180 dias: 22,5%;
- 181 a 360 dias: 20%;
- 361 a 720 dias: 17,5%;
- acima de 720 dias: 15%.

Regras:

- investimento principal isento: IR igual a zero;
- investimento principal nao isento: aplicar tabela regressiva sobre o rendimento;
- CDB 100% CDI: aplicar tabela regressiva;
- LCI/LCA e poupanca: IR igual a zero.

Se o rendimento for negativo ou zero, o IR sera zero.

## Resultados

A area de resultados deve mostrar:

- card principal com o valor liquido final do investimento escolhido;
- cards secundarios com total investido, rendimento bruto, imposto estimado e rendimento liquido;
- destaque de ganho real estimado quando o tipo escolhido for `IPCA + taxa`;
- grafico de evolucao mes a mes;
- tabela/resumo final dos comparativos.

O grafico comparara:

- investimento escolhido;
- poupanca;
- CDB 100% CDI;
- LCI/LCA 85% CDI.

A tabela final deve mostrar, para cada alternativa:

- valor bruto final;
- imposto estimado;
- valor liquido final;
- diferenca em relacao ao investimento escolhido.

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
- IPCA anual maior ou igual a zero;
- taxa informada valida para o tipo de investimento.

Estados invalidos ou incompletos devem mostrar uma area vazia amigavel, seguindo o padrao das calculadoras atuais.

## Testes

Devem ser criados testes unitarios para os calculos puros, cobrindo:

- conversao de taxa anual para mensal;
- investimento com aporte no fim do mes;
- calculo de IR regressivo por prazo;
- investimento isento e nao isento;
- CDB 100% CDI tributado;
- LCI/LCA 85% CDI isenta;
- regra da poupanca com CDI acima e abaixo de 8,5%;
- calculo nominal de `IPCA + taxa`.

Tambem deve ser executado o build do projeto apos a implementacao.

## Fora de Escopo

Esta versao nao inclui:

- integracao com API ANBIMA;
- busca automatica de CDI/IPCA;
- persistencia de simulacoes;
- autenticacao especifica para a calculadora;
- exportacao em PDF;
- compartilhamento de resultado.
