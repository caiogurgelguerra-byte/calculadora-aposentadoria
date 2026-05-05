# Calculadora de Aposentadoria — Design Spec

**Data:** 2026-05-05  
**Status:** Aprovado

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

## Inputs do Usuário

### Campos obrigatórios

| Campo | Tipo | Validação |
|-------|------|-----------|
| Renda mensal desejada | R$ (moeda) | > 0 |
| Idade atual | inteiro | 18–70 |
| Idade de aposentadoria | inteiro | > idade atual, ≤ 80 |

### Campos opcionais

| Campo | Tipo | Padrão |
|-------|------|--------|
| Patrimônio atual investido | R$ (moeda) | R$ 0 |

### Parâmetros avançados (colapsados por padrão)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| Rentabilidade real na acumulação | % a.a. | 6% | Taxa real (já descontada inflação) durante a fase de acumulação |
| Rentabilidade real na retirada | % a.a. | 4% | Taxa real durante a fase de saques |
| Expectativa de vida | anos | 85 | Usado no Cenário C |

> **Nota:** todos os cálculos são em termos reais. A renda desejada representa o poder de compra de hoje — a inflação não é projetada separadamente.

---

## Modelo Financeiro

### Conversão de taxa anual para mensal

```
taxa_mensal = (1 + taxa_anual)^(1/12) - 1
```

### Patrimônio necessário na aposentadoria (por cenário)

**Cenário A — Renda perpétua**
O capital nunca é consumido; o usuário vive apenas dos rendimentos.

```
C_A = renda_mensal / taxa_mensal_retirada
```

**Cenário B — Período fixo até 90 anos**
O capital é consumido ao longo de `n` meses entre a aposentadoria e os 90 anos.

```
n_B = (90 - idade_aposentadoria) × 12
C_B = renda_mensal × [(1 - (1 + r)^-n_B) / r]
```

**Cenário C — Expectativa de vida configurável**
Mesmo cálculo do B, usando a expectativa de vida definida pelo usuário.

```
n_C = (expectativa_vida - idade_aposentadoria) × 12
C_C = renda_mensal × [(1 - (1 + r)^-n_C) / r]
```

### Aporte mensal necessário

Dado o capital necessário `FV`, patrimônio atual `PV`, taxa mensal `r` e períodos de acumulação `n`:

```
n = (idade_aposentadoria - idade_atual) × 12
FV_patrimonio = PV × (1 + r_acumulacao)^n

# Se FV_patrimonio >= FV: meta já atingida com patrimônio atual
PMT = (FV - FV_patrimonio) × r_acumulacao / ((1 + r_acumulacao)^n - 1)
```

### Dados para o gráfico

Simulação ano a ano:
- **Fase de acumulação:** `patrimônio(t+1) = patrimônio(t) × (1 + r_acumulacao)^12 + PMT × 12`
- **Fase de retirada:** `patrimônio(t+1) = patrimônio(t) × (1 + r_retirada)^12 - renda_mensal × 12`

O gráfico exibe as três curvas (A, B, C) simultaneamente, com uma linha vertical tracejada marcando a idade de aposentadoria.

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
│                      │  [Tabela anual resumida]             │
│  ▶ Parâmetros        │   Ano | Patrimônio | Aporte | Saque  │
│    avançados         │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### Comportamentos

- Inputs monetários com máscara brasileira (R$ 10.000,00)
- Resultados só aparecem após todos os campos obrigatórios estarem preenchidos e válidos
- Os 3 cards de cenário usam cores distintas para identificação visual
- A tabela exibe projeção anual com scroll interno (máximo 10 linhas visíveis)
- Layout responsivo: em mobile, inputs ficam empilhados acima dos resultados (coluna única)
- Parâmetros avançados ficam em `<details>` colapsado; ao expandir, os resultados recalculam imediatamente

### Componentes

| Componente | Responsabilidade |
|------------|-----------------|
| `InputForm` | Renderiza todos os inputs, emite mudanças via callback |
| `ScenarioCards` | Recebe os 3 resultados calculados e exibe cards coloridos |
| `ProjectionChart` | Recebe dados de simulação ano a ano e renderiza o gráfico Recharts |
| `SummaryTable` | Recebe os dados anuais e renderiza a tabela com scroll |
| `useCalculations` | Hook puro: recebe inputs, retorna resultados via useMemo |
| `calculations.ts` | Funções matemáticas puras e testáveis independentemente |

---

## Casos de Borda

| Situação | Comportamento |
|----------|---------------|
| Patrimônio atual já suficiente para a meta | Exibe mensagem "Meta já atingida!" em vez do aporte |
| Idade de aposentadoria ≤ idade atual | Campo inválido, bloqueia cálculo |
| Expectativa de vida ≤ idade de aposentadoria | Campo inválido, bloqueia cálculo |
| Taxa de retirada = 0 | Desabilita o campo, evita divisão por zero |
| PMT negativo (patrimônio supera meta) | Trata como "Meta já atingida" |

---

## Fora do Escopo

- Autenticação ou salvamento de sessão
- Comparação entre diferentes tipos de investimento
- Integração com dados de mercado em tempo real
- Geração de PDF ou exportação de resultados
