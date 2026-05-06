# Design: Portal "Seu Mapa Financeiro"

**Data:** 2026-05-06
**Status:** Aprovado

## Visão Geral

Expandir a calculadora de aposentadoria existente em um portal financeiro chamado **"Seu Mapa Financeiro"** — uma coleção de calculadoras e insights sobre gestão financeira pessoal. A primeira expansão adiciona uma calculadora de salário líquido (CLT Brasil).

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + Recharts + react-router-dom

A dependência `react-router-dom` será adicionada ao projeto existente.

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
    Layout.tsx                  ← shell com header persistente
    Header.tsx
  hooks/
    aposentadoria/
      useCalculations.ts        ← hook existente movido para cá
    salario/
      useSalarioCalculations.ts ← novo hook
  lib/
    aposentadoria/              ← lógica de cálculo existente
      calculations.ts
      types.ts
    salario/                    ← nova lógica de cálculo
      calculations.ts
      calculations.test.ts
      taxTables.ts              ← tabelas INSS/IRRF 2025 (ver nota de atualização)
      types.ts
```

## Roteamento

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `Home` | Landing page com cards das calculadoras |
| `/aposentadoria` | `AposentadoriaPage` | Calculadora de aposentadoria (existente) |
| `/salario` | `SalarioPage` | Calculadora de salário líquido |

## Layout Compartilhado

Um componente `<Layout>` envolve todas as páginas com:
- **Header** contendo o nome "Seu Mapa Financeiro" e link para `/`
- Visual consistente com o estilo já estabelecido (gradiente, tipografia)

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
- Cada dependente deduz R$ 189,59 da base do IRRF (valor 2025)

**13º Salário:**
- Checkbox para incluir o cálculo
- Mostra cálculo separado: INSS do 13º + IRRF do 13º (alíquota exclusiva na fonte)
- Exibe valor líquido do 13º

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

**INSS 2025** — alíquotas progressivas (4 faixas):
| Faixa (R$) | Alíquota |
|------------|----------|
| Até 1.518,00 | 7,5% |
| 1.518,01 – 2.793,88 | 9% |
| 2.793,89 – 4.190,83 | 12% |
| 4.190,84 – 8.157,41 | 14% |
| Acima de 8.157,41 | Teto: R$ 908,85 |

**IRRF 2025** — tabela progressiva (mesma de 2024):
| Base de cálculo (R$) | Alíquota | Parcela a deduzir |
|----------------------|----------|-------------------|
| Até 2.259,20 | Isento | — |
| 2.259,21 – 2.826,65 | 7,5% | 169,44 |
| 2.826,66 – 3.751,05 | 15% | 381,44 |
| 3.751,06 – 4.664,68 | 22,5% | 662,77 |
| Acima de 4.664,68 | 27,5% | 896,00 |

## Calculadora de Aposentadoria

Sem nenhuma mudança funcional. Os arquivos serão movidos de `src/components/` e `src/lib/` para `src/calculators/aposentadoria/` e `src/lib/aposentadoria/` respectivamente, com imports atualizados.

## Testes

- `src/lib/salario/calculations.test.ts` com casos para: INSS progressivo, IRRF com e sem dependentes, 13º, comparativo de faixas
- Seguir padrão de testes existente em `src/lib/calculations.test.ts`

## Fora de Escopo

- Autenticação ou persistência de dados
- Outras calculadoras além das duas descritas
- Suporte a múltiplas tabelas fiscais por ano (apenas 2025; atualizar manualmente em 2026)
- Contribuição sindical ou outros descontos opcionais
