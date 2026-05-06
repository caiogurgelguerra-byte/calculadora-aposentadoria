# Design: Portal "Seu Mapa Financeiro"

**Data:** 2026-05-06
**Status:** Aprovado

## Visão Geral

Expandir a calculadora de aposentadoria existente em um portal financeiro chamado **"Seu Mapa Financeiro"** — uma coleção de calculadoras e insights sobre gestão financeira pessoal. A primeira expansão adiciona uma calculadora de salário líquido (CLT Brasil).

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + Recharts + **react-router-dom v6**

A dependência `react-router-dom` (v6) será adicionada ao projeto existente. Usar `<Routes>` / `<Route>` — não `<Switch>` (API v5).

## Estrutura de Pastas

```
src/
  pages/
    Home.tsx                    ← landing page com cards
    AposentadoriaPage.tsx       ← wrapper da calculadora de aposentadoria
    SalarioPage.tsx             ← wrapper da calculadora de salário
  calculators/
    aposentadoria/              ← arquivos atuais movidos sem alteração funcional
      InputForm.tsx
      ProjectionChart.tsx
      ScenarioCards.tsx
      SummaryTable.tsx
      ExplanationBox.tsx
    salario/                    ← nova calculadora
      InputForm.tsx
      ResultCard.tsx
      ComparisonTable.tsx
  components/
    Layout.tsx                  ← shell com header persistente; Header é interno a Layout, não exportado separadamente
  hooks/
    aposentadoria/
      useCalculations.ts        ← hook existente movido para cá
    salario/
      useSalarioCalculations.ts ← novo hook
  lib/
    aposentadoria/              ← lógica de cálculo existente
      calculations.ts
      calculations.test.ts      ← movido de src/lib/calculations.test.ts
      types.ts
    salario/                    ← nova lógica de cálculo
      calculations.ts
      calculations.test.ts
      taxTables.ts              ← tabelas INSS/IRRF 2025 (ver nota de atualização)
      types.ts
```

**Arquivos modificados (não movidos):**
- `src/main.tsx` — envolver a aplicação com `<BrowserRouter>` do react-router-dom para habilitar o roteamento.
- `src/App.tsx` — substituir o monolito atual (que contém toda a calculadora de aposentadoria) por um router shell com `<Routes>` apontando para as páginas. Todo o conteúdo de negócio sai de `App.tsx` e vai para `AposentadoriaPage.tsx`.

**Arquivos que permanecem no lugar:** `src/test-setup.ts`, `src/vite-env.d.ts`, `src/index.css` — não movidos, não alterados.

## Roteamento

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Home` | Landing page com cards das calculadoras |
| `/aposentadoria` | `AposentadoriaPage` | Calculadora de aposentadoria (existente) |
| `/salario` | `SalarioPage` | Calculadora de salário líquido |

## Layout Compartilhado

Um componente `<Layout>` envolve todas as páginas com:
- **Header interno** contendo o nome "Seu Mapa Financeiro" e link para `/`
- Visual consistente com o estilo já estabelecido (gradiente, tipografia)

`Header` não é um componente separado exportável — é parte interna de `Layout.tsx`.

## Home Page

Cards lado a lado (responsivo: empilhados em mobile), cada um com:
- Ícone representativo
- Título da calculadora
- Descrição de uma linha
- Link/botão para abrir

Cards iniciais:
1. **Calculadora de Aposentadoria** — "Descubra quanto poupar por mês para se aposentar com a renda que você quer"
2. **Calculadora de Salário Líquido** — "Veja exatamente quanto cai na sua conta após INSS e IR"

## Calculadora de Salário Líquido

### Campos simples (sempre visíveis)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Salário bruto | Número (R$) | Entrada principal |

### Resultados imediatos (atualizam ao digitar)

| Campo | Descrição |
|-------|-----------|
| Desconto INSS | Calculado com alíquotas progressivas 2025 |
| Base de cálculo IRRF | Bruto − INSS − deduções por dependentes |
| Desconto IRRF | Calculado com tabela progressiva 2025 |
| **Salário líquido** | Bruto − INSS − IRRF |

### Seção expansível "Detalhes"

**Dependentes:**
- Número de dependentes (inteiro ≥ 0)
- Cada dependente deduz R$ 189,59/mês da base do IRRF (valor 2025)
- **Dependentes NÃO reduzem a base do IRRF do 13º salário** (lei específica para a tributação exclusiva na fonte do 13º)

**13º Salário:**
- Checkbox para incluir o cálculo
- O INSS do 13º é calculado com a mesma tabela progressiva aplicada ao valor bruto do 13º separadamente
- O IRRF do 13º é calculado sobre `(13º bruto − INSS do 13º)` usando a tabela progressiva padrão — **sem dedução de dependentes**
- Exibe: 13º bruto | INSS do 13º | IRRF do 13º | **13º líquido**

**Comparativo:**
- Tabela com faixas de salário bruto: R$1.500, R$2.000, R$3.000, R$5.000, R$8.000, R$10.000, R$15.000, R$20.000
- Colunas: Bruto | INSS | IRRF | Líquido | % Desconto total
- Usa o mesmo número de dependentes configurado pelo usuário
- Linha do salário atual destacada

### Tabelas fiscais (taxTables.ts)

```typescript
// ATENÇÃO: Atualizar estas tabelas quando sair a reforma do IR (prevista para 2026)
// A reforma isenta salários até R$5.000/mês e altera as faixas acima disso.
```

**INSS 2025** — alíquotas progressivas (4 faixas, Portaria MPS 1.716/2024):

| Faixa (R$) | Alíquota |
|------------|----------|
| Até 1.518,00 | 7,5% |
| 1.518,01 – 2.793,88 | 9% |
| 2.793,89 – 4.190,83 | 12% |
| 4.190,84 – 8.157,41 | 14% |

Para salários acima de R$8.157,41: aplicar as 4 faixas apenas até R$8.157,41 — o resultado é sempre o teto de **R$951,63**. Não modelar como quinta faixa.

Arredondar cada faixa individualmente a 2 casas decimais antes de somar (não somar os valores brutos e depois arredondar).

**IRRF 2025** — tabela progressiva (mesma de 2024, Receita Federal):

| Base de cálculo (R$) | Alíquota | Parcela a deduzir |
|----------------------|----------|-------------------|
| Até 2.259,20 | Isento | — |
| 2.259,21 – 2.826,65 | 7,5% | 169,44 |
| 2.826,66 – 3.751,05 | 15% | 381,44 |
| 3.751,06 – 4.664,68 | 22,5% | 662,77 |
| Acima de 4.664,68 | 27,5% | 896,00 |

**Exemplo de cálculo verificado** (salário bruto R$5.000, 0 dependentes):
- INSS: (1.518,00 × 7,5%) + (1.275,88 × 9%) + (1.396,95 × 12%) + (809,17 × 14%) = 113,85 + 114,83 + 167,63 + 113,28 = **R$509,59**
- Base IRRF: 5.000,00 − 509,59 = R$4.490,41
- IRRF: (4.490,41 × 22,5%) − 662,77 = 1.010,34 − 662,77 = **R$347,57**
- Líquido: 5.000,00 − 509,59 − 347,57 = **R$4.142,84**

**Exemplo 2 — faixa 27,5%** (salário bruto R$10.000, 0 dependentes):
- INSS: 113,85 + 114,83 + 167,63 + (5.966,58 × 14%) = 113,85 + 114,83 + 167,63 + 555,32 = **R$951,63** (teto atingido — salário acima de R$8.157,41)
- Base IRRF: 10.000,00 − 951,63 = R$9.048,37
- IRRF: (9.048,37 × 27,5%) − 896,00 = 2.488,30 − 896,00 = **R$1.592,30**
- Líquido: 10.000,00 − 951,63 − 1.592,30 = **R$7.456,07**

Use estes dois exemplos para validar a implementação antes de escrever os testes.

## Calculadora de Aposentadoria

Sem nenhuma mudança funcional. Arquivos movidos:

| De | Para |
|----|------|
| `src/components/*.tsx` | `src/calculators/aposentadoria/` |
| `src/lib/calculations.ts` | `src/lib/aposentadoria/calculations.ts` |
| `src/lib/calculations.test.ts` | `src/lib/aposentadoria/calculations.test.ts` |
| `src/lib/types.ts` | `src/lib/aposentadoria/types.ts` |
| `src/hooks/useCalculations.ts` | `src/hooks/aposentadoria/useCalculations.ts` |

Todos os imports internos devem ser atualizados após a movimentação.

## Testes

- `src/lib/salario/calculations.test.ts` com casos para: INSS progressivo, IRRF com e sem dependentes, 13º (sem dependentes), comparativo de faixas
- Usar o exemplo verificado acima (R$5.000 bruto) como âncora numérica nos testes
- Seguir padrão de testes existente em `src/lib/aposentadoria/calculations.test.ts` (após migração)

## Fora de Escopo

- Autenticação ou persistência de dados
- Outras calculadoras além das duas descritas
- Suporte a múltiplas tabelas fiscais por ano (apenas 2025; atualizar manualmente em 2026)
- Contribuição sindical ou outros descontos opcionais
