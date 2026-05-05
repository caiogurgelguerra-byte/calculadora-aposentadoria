# Calculadora de Aposentadoria — Design Spec

**Data:** 2026-05-05  
**Status:** Aprovado (revisado após code review)

---

## Visão Geral

Web app de página única para calcular quanto uma pessoa precisa poupar mensalmente para atingir uma renda de aposentadoria desejada, já corrigida pela inflação. A ferramenta exibe três cenários simultaneamente, com gráfico de projeção e tabela resumida.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Estilização | Tailwind CSS |
| Gráficos | Recharts |
| Estado | React hooks (useState, useMemo) |
| Backend | Nenhum — cálculos 100% client-side |

---

## Estrutura de Arquivos

```
src/
  components/
    InputForm.tsx        # formulário de inputs do usuário
    ScenarioCards.tsx    # 3 cards de cenário lado a lado
    ProjectionChart.tsx  # gráfico de linha (Recharts)
    SummaryTable.tsx     # tabela detalhada de projeção anual
  lib/
    calculations.ts      # funções puras de matemática financeira
    types.ts             # tipos TypeScript compartilhados
  hooks/
    useCalculations.ts   # hook que deriva resultados dos inputs via useMemo
  App.tsx                # estado global + layout lado a lado
  main.tsx               # entry point Vite
```

---

## Tipos TypeScript (`types.ts`)

```typescript
interface UserInputs {
  rendaMensal: number;          // R$ desejados por mês na aposentadoria
  idadeAtual: number;           // anos
  idadeAposentadoria: number;   // anos
  patrimonioAtual: number;      // R$ já investidos (default 0)
  rentabilidadeAcumulacao: number; // % a.a. real (default 6)
  rentabilidadeRetirada: number;   // % a.a. real (default 4)
  expectativaVida: number;      // anos (default 85)
}

interface ScenarioResult {
  nome: string;                 // "Renda Perpétua" | "Período Fixo (90 anos)" | "Expectativa de Vida"
  capitalNecessario: number;    // R$ necessários na aposentadoria
  aporteMensal: number;        // PMT mensal na fase de acumulação
  metaJaAtingida: boolean;     // true se patrimonioAtual já cobre capitalNecessario
}

interface SimulationDataPoint {
  idade: number;
  cenarioA: number;            // patrimônio no Cenário A naquele ano
  cenarioB: number;
  cenarioC: number;
}

interface CalculationResults {
  cenarioA: ScenarioResult;
  cenarioB: ScenarioResult;
  cenarioC: ScenarioResult;
  simulacao: SimulationDataPoint[];  // array ano a ano, acumulação + retirada
}
```

---

## Inputs do Usuário

### Campos obrigatórios

| Campo | Tipo | Validação |
|-------|------|-----------|
| Renda mensal desejada | R$ (moeda) | > 0 |
| Idade atual | inteiro | 18–70 |
| Idade de aposentadoria | inteiro | > idade atual e ≤ 80 |

> O limite de ≤ 80 para a idade de aposentadoria garante que o Cenário B (`n_B = (90 - idade_aposentadoria) × 12`) tenha sempre `n_B ≥ 120` meses, evitando divisão por zero ou resultado sem sentido.

### Campos opcionais

| Campo | Tipo | Padrão |
|-------|------|--------|
| Patrimônio atual investido | R$ (moeda) | R$ 0 |

### Parâmetros avançados (colapsados por padrão)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| Rentabilidade real na acumulação | % a.a. | 6% | Taxa real (já descontada inflação) durante a fase de acumulação |
| Rentabilidade real na retirada | % a.a. | 4% | Taxa real durante a fase de saques |
| Expectativa de vida | anos | 85 | Usado no Cenário C; deve ser > idade de aposentadoria |

> **Todos os cálculos são em termos reais.** A renda desejada representa o poder de compra de hoje — a inflação não é projetada separadamente. As taxas de rentabilidade devem ser informadas já descontadas da inflação.

---

## Modelo Financeiro

### Conversão de taxa anual para mensal

```
r_ac  = (1 + rentabilidadeAcumulacao / 100)^(1/12) - 1
r_ret = (1 + rentabilidadeRetirada / 100)^(1/12) - 1
```

### Patrimônio necessário na aposentadoria (por cenário)

As fórmulas de Cenários B e C usam **`r_ret`** (taxa mensal da fase de retirada), pois é nessa fase que os saques ocorrem.

**Cenário A — Renda perpétua**  
O capital nunca é consumido; o usuário vive apenas dos rendimentos.

```
C_A = rendaMensal / r_ret
```

> Se `r_ret = 0`, o Cenário A é indefinido (capital infinito). Nesse caso, exibir "Indefinido" no card A.

**Cenário B — Período fixo até 90 anos**  
O capital é consumido ao longo de `n_B` meses entre a aposentadoria e os 90 anos.

```
n_B = (90 - idadeAposentadoria) × 12
C_B = rendaMensal × [(1 - (1 + r_ret)^-n_B) / r_ret]
```

> Se `r_ret = 0`: `C_B = rendaMensal × n_B` (limite matemático da fórmula quando r → 0).

**Cenário C — Expectativa de vida configurável**  
Mesmo cálculo do B, usando a expectativa de vida definida pelo usuário.

```
n_C = (expectativaVida - idadeAposentadoria) × 12
C_C = rendaMensal × [(1 - (1 + r_ret)^-n_C) / r_ret]
```

> Se `r_ret = 0`: `C_C = rendaMensal × n_C`.

### Aporte mensal necessário (calculado individualmente por cenário)

Cada cenário tem seu próprio `PMT` calculado a partir do seu respectivo capital necessário (`C_A`, `C_B`, `C_C`). O patrimônio atual cresce na fase de acumulação usando `r_ac`.

```
n_ac = (idadeAposentadoria - idadeAtual) × 12
FV_patrimonio = patrimonioAtual × (1 + r_ac)^n_ac

# Para cada cenário X (A, B ou C):
Se FV_patrimonio >= C_X:
  → metaJaAtingida = true, aporteMensal = 0

Senão:
  PMT_X = (C_X - FV_patrimonio) × r_ac / ((1 + r_ac)^n_ac - 1)
```

> Os cards exibirão `PMT_A`, `PMT_B` e `PMT_C` respectivamente — valores distintos para cada cenário.

### Dados para o gráfico (simulação ano a ano)

A simulação produz um `SimulationDataPoint` por ano, combinando as três curvas num único array. Isso permite que o Recharts `LineChart` consuma um único `data` prop com três `<Line>` components.

**Fase de acumulação** (do `idadeAtual` até `idadeAposentadoria`, usando `PMT_X` de cada cenário):

```
# Para cada cenário X:
patrimônio(t+1) = patrimônio(t) × (1 + r_ac)^12
                + PMT_X × ((1 + r_ac)^12 - 1) / r_ac
```

> Esta fórmula computa corretamente o rendimento intra-anual dos 12 aportes mensais, evitando a aproximação `PMT × 12` que subestima o resultado.

**Fase de retirada** (do `idadeAposentadoria` até `max(90, expectativaVida)`, usando `rendaMensal`):

```
# Para cada cenário X:
patrimônio(t+1) = patrimônio(t) × (1 + r_ret)^12
                - rendaMensal × ((1 + r_ret)^12 - 1) / r_ret
```

> Da mesma forma, os 12 saques mensais são tratados como uma anuidade, não como um lump sum anual.

**Estado "meta já atingida":** Se `metaJaAtingida = true` para um cenário, a linha do gráfico começa no `patrimonioAtual` na `idadeAtual` (sem aportes na fase de acumulação) e depois decai normalmente na fase de retirada.

---

## Interface

### Layout desktop (duas colunas)

```
┌─────────────────────────────────────────────────────────────┐
│  Calculadora de Aposentadoria                               │
├──────────────────────┬──────────────────────────────────────┤
│  INPUTS              │  RESULTADOS                          │
│                      │                                      │
│  Renda desejada      │  ┌──────┐ ┌──────┐ ┌──────┐        │
│  R$ [_______]        │  │  A   │ │  B   │ │  C   │        │
│                      │  │Perp. │ │90a   │ │Expect│        │
│  Idade atual         │  │      │ │      │ │      │        │
│  [__] anos           │  │R$XXX │ │R$XXX │ │R$XXX │        │
│                      │  │/mês  │ │/mês  │ │/mês  │        │
│  Aposentar-se com    │  └──────┘ └──────┘ └──────┘        │
│  [__] anos           │                                      │
│                      │  [Gráfico de linha — Recharts]       │
│  Patrimônio atual    │   Acumulação ──── Retirada           │
│  R$ [_______]        │                                      │
│                      │  [Tabela: cenário selecionado]       │
│  ▶ Parâmetros        │   Ano | Patrimônio | Aporte | Saque  │
│    avançados         │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### Comportamentos

- Inputs monetários com máscara brasileira (R$ 10.000,00)
- Todos os valores exibidos (cards, tabela, eixos do gráfico) formatados em `pt-BR` com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- Resultados só aparecem após todos os campos obrigatórios estarem preenchidos e válidos
- Os 3 cards de cenário usam cores distintas para identificação visual (ex.: azul para A, verde para B, laranja para C)
- O gráfico mostra as três linhas simultaneamente, com a mesma paleta de cores dos cards; linha vertical tracejada marca a `idadeAposentadoria`
- A tabela exibe **o cenário selecionado pelo usuário** (clique no card ativa a seleção; padrão: Cenário A). Colunas: Idade | Patrimônio | Aporte Mensal | Saque Mensal
- A tabela tem scroll interno; exibe todos os anos (acumulação + retirada)
- Parâmetros avançados controlados por `useState` (toggle booleano), não `<details>` HTML, para manter padrão React/Tailwind
- Layout responsivo: em mobile, inputs ficam empilhados acima dos resultados (coluna única)
- Sem debounce: os recálculos via `useMemo` são instantâneos mesmo para horizontes de 60 anos (< 1ms)

### Estado "Meta já atingida"

Quando `metaJaAtingida = true` em um cenário:
- O card exibe "Meta já atingida! Seu patrimônio atual é suficiente." em vez do aporte
- A linha do gráfico para aquele cenário começa no `patrimonioAtual` e mostra apenas a fase de retirada
- A tabela (se aquele cenário estiver selecionado) exibe `Aporte: R$ 0,00` em todas as linhas da fase de acumulação

### Componentes

| Componente | Responsabilidade |
|------------|-----------------|
| `InputForm` | Renderiza todos os inputs; emite `UserInputs` via callback `onChange: (inputs: UserInputs) => void` |
| `ScenarioCards` | Recebe `CalculationResults` e `selectedScenario`; emite `onSelectScenario: (s: 'A' \| 'B' \| 'C') => void` |
| `ProjectionChart` | Recebe `SimulationDataPoint[]` e `idadeAposentadoria`; renderiza gráfico Recharts |
| `SummaryTable` | Recebe `SimulationDataPoint[]`, `selectedScenario` e os `ScenarioResult`s; exibe tabela do cenário selecionado |
| `useCalculations` | Recebe `UserInputs`; retorna `CalculationResults \| null` (null se inputs inválidos) |
| `calculations.ts` | Funções matemáticas puras e testáveis independentemente |

---

## Casos de Borda

| Situação | Comportamento |
|----------|---------------|
| Patrimônio atual já cobre um ou mais cenários | `metaJaAtingida = true` para aquele(s) cenário(s); card e tabela adaptados conforme descrito |
| Idade de aposentadoria ≤ idade atual | Campo inválido, resultados ocultos |
| Idade de aposentadoria > 80 | Campo inválido (fora do intervalo permitido), resultados ocultos |
| Expectativa de vida ≤ idade de aposentadoria | Campo inválido, resultados ocultos |
| `r_ret = 0` no Cenário A | Card A exibe "Indefinido (capital infinito necessário)" |
| `r_ret = 0` nos Cenários B e C | Calculado como `rendaMensal × n` (limite correto da fórmula) |
| `r_ac = 0` | PMT calculado sem rendimento: `PMT = (C_X - patrimonioAtual) / n_ac` |
| PMT negativo (patrimônio supera meta) | Tratado como `metaJaAtingida = true` |
| Renda desejada = 0 | Campo inválido, resultados ocultos |

---

## Fora do Escopo

- Autenticação ou salvamento de sessão
- Comparação entre diferentes tipos de investimento
- Integração com dados de mercado em tempo real
- Geração de PDF ou exportação de resultados
- Projeção de inflação separada (o modelo é 100% em termos reais)
