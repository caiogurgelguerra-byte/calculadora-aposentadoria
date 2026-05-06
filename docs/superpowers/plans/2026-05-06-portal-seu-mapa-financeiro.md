# Portal "Seu Mapa Financeiro" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing retirement calculator into a multi-calculator portal called "Seu Mapa Financeiro", adding a net salary calculator (CLT Brazil) and a home page with navigation cards.

**Architecture:** Add react-router-dom v7 (direct successor to v6, same API surface used here); restructure files into `calculators/`, `pages/`, `lib/<domain>/`, `hooks/<domain>/`; shared `Layout.tsx` wraps all pages via `<Outlet>`; `App.tsx` becomes a pure router shell; existing aposentadoria calculator moves without functional changes; new salary calculator uses TDD for all calculation logic.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, react-router-dom v7, Vitest

---

### Task 1: Install react-router-dom

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the dependency**

```bash
npm install react-router-dom
```

Expected output: `added N packages` with react-router-dom appearing in `package.json` dependencies.

- [ ] **Step 2: Verify types are available**

```bash
npx tsc --noEmit
```

Expected: no errors (react-router-dom v7 ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom v7"
```

---

### Task 2: Migrate aposentadoria files to new folder structure

Move existing files to domain folders using `git mv` so git history is preserved. No functional changes — only import paths are updated.

**Files:**
- Move: `src/lib/calculations.ts` → `src/lib/aposentadoria/calculations.ts`
- Move: `src/lib/calculations.test.ts` → `src/lib/aposentadoria/calculations.test.ts`
- Move: `src/lib/types.ts` → `src/lib/aposentadoria/types.ts`
- Move: `src/hooks/useCalculations.ts` → `src/hooks/aposentadoria/useCalculations.ts`
- Move: `src/components/InputForm.tsx` → `src/calculators/aposentadoria/InputForm.tsx`
- Move: `src/components/ProjectionChart.tsx` → `src/calculators/aposentadoria/ProjectionChart.tsx`
- Move: `src/components/ScenarioCards.tsx` → `src/calculators/aposentadoria/ScenarioCards.tsx`
- Move: `src/components/SummaryTable.tsx` → `src/calculators/aposentadoria/SummaryTable.tsx`
- Move: `src/components/ExplanationBox.tsx` → `src/calculators/aposentadoria/ExplanationBox.tsx`

- [ ] **Step 1: Create new directories**

```bash
mkdir -p src/lib/aposentadoria src/hooks/aposentadoria src/calculators/aposentadoria src/pages src/components
```

- [ ] **Step 2: Move files with git mv**

```bash
git mv src/lib/calculations.ts src/lib/aposentadoria/calculations.ts
git mv src/lib/calculations.test.ts src/lib/aposentadoria/calculations.test.ts
git mv src/lib/types.ts src/lib/aposentadoria/types.ts
git mv src/hooks/useCalculations.ts src/hooks/aposentadoria/useCalculations.ts
git mv src/components/InputForm.tsx src/calculators/aposentadoria/InputForm.tsx
git mv src/components/ProjectionChart.tsx src/calculators/aposentadoria/ProjectionChart.tsx
git mv src/components/ScenarioCards.tsx src/calculators/aposentadoria/ScenarioCards.tsx
git mv src/components/SummaryTable.tsx src/calculators/aposentadoria/SummaryTable.tsx
git mv src/components/ExplanationBox.tsx src/calculators/aposentadoria/ExplanationBox.tsx
```

- [ ] **Step 3: Update imports in `src/hooks/aposentadoria/useCalculations.ts`**

Change:
```typescript
import type { UserInputs, CalculationResults, ScenarioResult } from '../lib/types'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from '../lib/calculations'
```

To:
```typescript
import type { UserInputs, CalculationResults, ScenarioResult } from '../../lib/aposentadoria/types'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from '../../lib/aposentadoria/calculations'
```

- [ ] **Step 4: Update imports in moved calculator components**

In each of the 5 files under `src/calculators/aposentadoria/`, change every import that references `../lib/types` to `../../lib/aposentadoria/types`. The pattern is the same in all files:

```typescript
// Before (in every component file)
import type { ... } from '../lib/types'

// After
import type { ... } from '../../lib/aposentadoria/types'
```

The lib files themselves (`calculations.ts`, `types.ts`) import from each other with `./` — those paths remain correct after the move.

- [ ] **Step 5: Update imports in `src/App.tsx`**

Change:
```typescript
import type { UserInputs } from './lib/types'
import { useCalculations } from './hooks/useCalculations'
import InputForm from './components/InputForm'
import ScenarioCards from './components/ScenarioCards'
import ProjectionChart from './components/ProjectionChart'
import SummaryTable from './components/SummaryTable'
import ExplanationBox from './components/ExplanationBox'
```

To:
```typescript
import type { UserInputs } from './lib/aposentadoria/types'
import { useCalculations } from './hooks/aposentadoria/useCalculations'
import InputForm from './calculators/aposentadoria/InputForm'
import ScenarioCards from './calculators/aposentadoria/ScenarioCards'
import ProjectionChart from './calculators/aposentadoria/ProjectionChart'
import SummaryTable from './calculators/aposentadoria/SummaryTable'
import ExplanationBox from './calculators/aposentadoria/ExplanationBox'
```

- [ ] **Step 6: Run type-check and tests to verify nothing broke**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 TypeScript errors, all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move aposentadoria files to domain folders"
```

---

### Task 3: Create Layout, transform App.tsx into router shell, and wire main.tsx

**Files:**
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

Note: `src/pages/AposentadoriaPage.tsx` and `src/pages/Home.tsx` don't exist yet — Task 4 creates them. For now, `App.tsx` imports them with placeholder stubs so TypeScript won't error; the stubs will be replaced in Task 4.

- [ ] **Step 1: Create `src/components/Layout.tsx`**

```typescript
import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="text-lg font-bold text-white tracking-tight hover:text-blue-200 transition-colors"
          >
            Seu Mapa Financeiro
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder `src/pages/Home.tsx`** (will be replaced in Task 4)

```typescript
export default function Home() {
  return <div className="p-8 text-gray-600">Home — em breve</div>
}
```

- [ ] **Step 3: Create placeholder `src/pages/AposentadoriaPage.tsx`** (will be replaced in Task 4)

```typescript
export default function AposentadoriaPage() {
  return <div className="p-8 text-gray-600">Aposentadoria — em breve</div>
}
```

- [ ] **Step 4: Replace `src/App.tsx` with router shell**

```typescript
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AposentadoriaPage from './pages/AposentadoriaPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="aposentadoria" element={<AposentadoriaPage />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 5: Wrap app with `<BrowserRouter>` in `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 6: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Start dev server and verify routing works**

```bash
npm run dev
```

Open http://localhost:5173 — should show "Home — em breve" with the "Seu Mapa Financeiro" nav bar.
Open http://localhost:5173/aposentadoria — should show "Aposentadoria — em breve" with the nav bar.
Click "Seu Mapa Financeiro" in the nav — should navigate back to home.

- [ ] **Step 8: Stop dev server, commit**

```bash
git add -A
git commit -m "feat: add router shell, Layout with portal header, placeholder pages"
```

---

### Task 4: Create AposentadoriaPage and Home page

**Files:**
- Modify: `src/pages/AposentadoriaPage.tsx` (replace placeholder)
- Modify: `src/pages/Home.tsx` (replace placeholder)

- [ ] **Step 1: Replace `src/pages/AposentadoriaPage.tsx` with full content**

This is the current `App.tsx` business logic, extracted into a page component. The outer `<div className="min-h-screen bg-slate-50">` is removed (Layout handles it). The aposentadoria-specific hero header stays.

```typescript
import { useState, useCallback } from 'react'
import type { UserInputs } from '../lib/aposentadoria/types'
import { useCalculations } from '../hooks/aposentadoria/useCalculations'
import InputForm from '../calculators/aposentadoria/InputForm'
import ScenarioCards from '../calculators/aposentadoria/ScenarioCards'
import ProjectionChart from '../calculators/aposentadoria/ProjectionChart'
import SummaryTable from '../calculators/aposentadoria/SummaryTable'
import ExplanationBox from '../calculators/aposentadoria/ExplanationBox'

const DEFAULT_INPUTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 5.46,
  rentabilidadeRetirada: 5.46,
  expectativaVida: 85,
}

export default function AposentadoriaPage() {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULT_INPUTS)
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'C'>('A')
  const results = useCalculations(inputs)

  const handleInputChange = useCallback((next: UserInputs) => {
    setInputs(next)
  }, [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Aposentadoria</h1>
          <p className="text-sm text-blue-200 mt-2 max-w-2xl leading-relaxed">
            Todos os valores estão em <span className="text-white font-semibold">reais de hoje</span> — a inflação já está descontada dos cálculos.
            A <span className="text-white font-semibold">rentabilidade real</span> é o quanto seu dinheiro cresce além da inflação:
            se seus investimentos rendem <span className="text-white">10% ao ano</span> e a inflação é <span className="text-white">5%</span>,
            sua rentabilidade real é de aproximadamente <span className="text-white font-semibold">5% ao ano</span>.
            É esse crescimento real que usamos nos cálculos.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleInputChange} />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {results ? (
              <>
                <ScenarioCards
                  results={results}
                  selectedScenario={selectedScenario}
                  onSelectScenario={setSelectedScenario}
                />
                <ProjectionChart
                  simulacao={results.simulacao}
                  idadeAposentadoria={inputs.idadeAposentadoria}
                />
                <SummaryTable
                  simulacao={results.simulacao}
                  selectedScenario={selectedScenario}
                  results={results}
                  inputs={inputs}
                />
                <ExplanationBox
                  results={results}
                  inputs={inputs}
                  selectedScenario={selectedScenario}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-base font-semibold text-slate-500">Preencha seus dados</p>
                  <p className="text-sm mt-1">Os resultados aparecerão aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/pages/Home.tsx` with full content**

```typescript
import { Link } from 'react-router-dom'

const CALCULATORS = [
  {
    to: '/aposentadoria',
    icon: '🏦',
    title: 'Calculadora de Aposentadoria',
    description: 'Descubra quanto poupar por mês para se aposentar com a renda que você quer',
  },
  {
    to: '/salario',
    icon: '💰',
    title: 'Calculadora de Salário Líquido',
    description: 'Veja exatamente quanto cai na sua conta após INSS e IR',
  },
]

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800">Seu Mapa Financeiro</h1>
        <p className="text-slate-500 mt-2">Ferramentas para planejar sua vida financeira</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {CALCULATORS.map(calc => (
          <Link
            key={calc.to}
            to={calc.to}
            className="flex flex-col items-start gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
          >
            <span className="text-3xl">{calc.icon}</span>
            <h2 className="text-lg font-semibold text-slate-800">{calc.title}</h2>
            <p className="text-sm text-slate-500">{calc.description}</p>
            <span className="mt-auto text-sm font-medium text-blue-600">Acessar →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

```bash
npm run dev
```

Verify:
- http://localhost:5173 → home page with 2 cards ("Calculadora de Aposentadoria", "Calculadora de Salário Líquido")
- Click "Calculadora de Aposentadoria" → navigates to `/aposentadoria`, full retirement calculator works
- Click "Seu Mapa Financeiro" in nav → back to home
- http://localhost:5173/salario → 404 (expected — not built yet)

- [ ] **Step 5: Stop dev server, commit**

```bash
git add -A
git commit -m "feat: add AposentadoriaPage, Home page with calculator cards"
```

---

### Task 5: Salary lib — types and tax tables

**Files:**
- Create: `src/lib/salario/types.ts`
- Create: `src/lib/salario/taxTables.ts`

No tests needed for these files — they are pure data definitions. The calculation tests in Task 6 validate the tables indirectly.

- [ ] **Step 1: Create `src/lib/salario/types.ts`**

```bash
mkdir -p src/lib/salario src/calculators/salario src/hooks/salario
```

```typescript
export interface SalarioInputs {
  salarioBruto: number
  dependentes: number
  incluiDecimo: boolean
  showComparativo: boolean
}

export interface SalarioResult {
  bruto: number
  inss: number
  baseIRRF: number
  irrf: number
  liquido: number
}

export interface DecimoResult {
  bruto: number
  inss: number
  irrf: number
  liquido: number
}

export interface ComparativoRow {
  bruto: number
  inss: number
  irrf: number
  liquido: number
  percentualDesconto: number
  isCurrentSalary: boolean
}
```

- [ ] **Step 2: Create `src/lib/salario/taxTables.ts`**

```typescript
// ATENÇÃO: Atualizar estas tabelas quando sair a reforma do IR (prevista para 2026)
// A reforma isenta salários até R$5.000/mês e altera as faixas acima disso.

export const INSS_BRACKETS: Array<{ limite: number; aliquota: number }> = [
  { limite: 1518.00, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09  },
  { limite: 4190.83, aliquota: 0.12  },
  { limite: 8157.41, aliquota: 0.14  },
]

// Tabela progressiva com parcela dedutível (Receita Federal 2025).
// Nota: R$896,00 é o valor oficial publicado pela RFB (arredondado).
// No limite exato de R$4.664,68 pode ocorrer diferença de R$0,01 — esperado.
export const IRRF_BRACKETS: Array<{ limite: number; aliquota: number; parcela: number }> = [
  { limite: 2259.20,   aliquota: 0,     parcela: 0      },
  { limite: 2826.65,   aliquota: 0.075, parcela: 169.44 },
  { limite: 3751.05,   aliquota: 0.15,  parcela: 381.44 },
  { limite: 4664.68,   aliquota: 0.225, parcela: 662.77 },
  { limite: Infinity,  aliquota: 0.275, parcela: 896.00 },
]

export const DEDUCAO_DEPENDENTE = 189.59

export const COMPARISON_BRACKETS = [1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000]
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/salario/types.ts src/lib/salario/taxTables.ts
git commit -m "feat: add salary lib types and 2025 INSS/IRRF tax tables"
```

---

### Task 6: Implement salary calculations (TDD)

**Files:**
- Create: `src/lib/salario/calculations.test.ts`
- Create: `src/lib/salario/calculations.ts`

- [ ] **Step 1: Write failing tests in `src/lib/salario/calculations.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { calcINSS, calcIRRF, calcSalarioLiquido, calcDecimo, calcComparativo } from './calculations'

describe('calcINSS', () => {
  it('returns 0 for salary 0', () => {
    expect(calcINSS(0)).toBe(0)
  })
  it('applies first bracket only for salary R$1.000', () => {
    // 1000 × 7.5% = 75.00
    expect(calcINSS(1000)).toBe(75.00)
  })
  it('applies progressive brackets for salary R$5.000 (Exemplo 1 do spec)', () => {
    // 113.85 + 114.83 + 167.63 + 113.28 = 509.59
    expect(calcINSS(5000)).toBe(509.59)
  })
  it('returns ceiling R$951.63 for salary R$10.000 (above R$8.157,41)', () => {
    expect(calcINSS(10000)).toBe(951.63)
  })
  it('ceiling R$951.63 also applies at R$20.000', () => {
    expect(calcINSS(20000)).toBe(951.63)
  })
})

describe('calcIRRF', () => {
  it('returns 0 for base at or below R$2.259,20', () => {
    expect(calcIRRF(0)).toBe(0)
    expect(calcIRRF(2259.20)).toBe(0)
  })
  it('applies 22.5% bracket for base R$4.490,41 (Exemplo 1)', () => {
    // 4490.41 × 22.5% − 662.77 = 1010.34 − 662.77 = 347.57
    expect(calcIRRF(4490.41)).toBe(347.57)
  })
  it('applies 27.5% bracket for base R$9.048,37 (Exemplo 2)', () => {
    // 9048.37 × 27.5% − 896.00 = 2488.30 − 896.00 = 1592.30
    expect(calcIRRF(9048.37)).toBe(1592.30)
  })
})

describe('calcSalarioLiquido', () => {
  it('Exemplo 1: R$5.000 bruto, 0 dependentes', () => {
    const r = calcSalarioLiquido(5000, 0)
    expect(r.inss).toBe(509.59)
    expect(r.baseIRRF).toBe(4490.41)
    expect(r.irrf).toBe(347.57)
    expect(r.liquido).toBe(4142.84)
  })
  it('Exemplo 2: R$10.000 bruto, 0 dependentes', () => {
    const r = calcSalarioLiquido(10000, 0)
    expect(r.inss).toBe(951.63)
    expect(r.baseIRRF).toBe(9048.37)
    expect(r.irrf).toBe(1592.30)
    expect(r.liquido).toBe(7456.07)
  })
  it('dependentes reduce baseIRRF by R$189,59 each', () => {
    const r = calcSalarioLiquido(5000, 2)
    expect(r.baseIRRF).toBeCloseTo(4490.41 - 2 * 189.59, 2)
  })
  it('returns 0 for salary 0', () => {
    const r = calcSalarioLiquido(0, 0)
    expect(r.inss).toBe(0)
    expect(r.irrf).toBe(0)
    expect(r.liquido).toBe(0)
  })
})

describe('calcDecimo', () => {
  it('IRRF is computed WITHOUT dependent deduction', () => {
    const decimoResult = calcDecimo(5000)
    // base for 13th = bruto - inss = 5000 - 509.59 = 4490.41 (no dependents deducted)
    expect(decimoResult.inss).toBe(509.59)
    // IRRF on 4490.41 = 347.57
    expect(decimoResult.irrf).toBe(347.57)
    expect(decimoResult.liquido).toBeCloseTo(5000 - 509.59 - 347.57, 2)
  })
  it('13th IRRF differs from monthly when dependents would reduce monthly IR base', () => {
    const monthly = calcSalarioLiquido(5000, 2)
    const decimo = calcDecimo(5000)
    // With 2 dependents, monthly baseIRRF = 4490.41 − 379.18 = 4111.23 → lower IRRF
    // Decimo ignores dependents so IRRF is higher
    expect(decimo.irrf).toBeGreaterThan(monthly.irrf)
  })
})

describe('calcComparativo', () => {
  it('returns 8 rows for the 8 predefined salary brackets', () => {
    expect(calcComparativo(5000, 0)).toHaveLength(8)
  })
  it('marks the current salary row (R$5.000)', () => {
    const rows = calcComparativo(5000, 0)
    expect(rows.find(r => r.bruto === 5000)?.isCurrentSalary).toBe(true)
    expect(rows.find(r => r.bruto === 3000)?.isCurrentSalary).toBe(false)
  })
  it('R$5.000 row matches calcSalarioLiquido directly', () => {
    const row = calcComparativo(5000, 0).find(r => r.bruto === 5000)!
    const direct = calcSalarioLiquido(5000, 0)
    expect(row.inss).toBe(direct.inss)
    expect(row.irrf).toBe(direct.irrf)
    expect(row.liquido).toBe(direct.liquido)
  })
  it('percentualDesconto = (inss + irrf) / bruto × 100', () => {
    const row = calcComparativo(5000, 0).find(r => r.bruto === 5000)!
    const expected = ((row.inss + row.irrf) / 5000) * 100
    expect(row.percentualDesconto).toBeCloseTo(expected, 2)
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
npm test
```

Expected: all tests in `src/lib/salario/calculations.test.ts` fail with "Cannot find module './calculations'".

- [ ] **Step 3: Create `src/lib/salario/calculations.ts`**

```typescript
import type { SalarioResult, DecimoResult, ComparativoRow } from './types'
import { INSS_BRACKETS, IRRF_BRACKETS, DEDUCAO_DEPENDENTE, COMPARISON_BRACKETS } from './taxTables'

export function calcINSS(bruto: number): number {
  const base = Math.min(bruto, 8157.41)
  let prev = 0
  let total = 0
  for (const { limite, aliquota } of INSS_BRACKETS) {
    if (base <= prev) break
    const topo = Math.min(base, limite)
    total += Math.round((topo - prev) * aliquota * 100) / 100
    prev = limite
    if (base <= limite) break
  }
  return total
}

export function calcIRRF(base: number): number {
  const bracket = IRRF_BRACKETS.find(b => base <= b.limite) ?? IRRF_BRACKETS[IRRF_BRACKETS.length - 1]
  const irrf = base * bracket.aliquota - bracket.parcela
  return Math.max(0, Math.round(irrf * 100) / 100)
}

export function calcSalarioLiquido(bruto: number, dependentes: number): SalarioResult {
  const inss = calcINSS(bruto)
  const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE
  const baseIRRF = Math.max(0, Math.round((bruto - inss - deducaoDependentes) * 100) / 100)
  const irrf = calcIRRF(baseIRRF)
  const liquido = Math.round((bruto - inss - irrf) * 100) / 100
  return { bruto, inss, baseIRRF, irrf, liquido }
}

export function calcDecimo(bruto: number): DecimoResult {
  const inss = calcINSS(bruto)
  const base = Math.max(0, Math.round((bruto - inss) * 100) / 100)
  const irrf = calcIRRF(base)
  const liquido = Math.round((bruto - inss - irrf) * 100) / 100
  return { bruto, inss, irrf, liquido }
}

export function calcComparativo(salarioAtual: number, dependentes: number): ComparativoRow[] {
  return COMPARISON_BRACKETS.map(bruto => {
    const r = calcSalarioLiquido(bruto, dependentes)
    const totalDesconto = r.inss + r.irrf
    const percentualDesconto = bruto > 0
      ? Math.round((totalDesconto / bruto) * 10000) / 100
      : 0
    return {
      bruto: r.bruto,
      inss: r.inss,
      irrf: r.irrf,
      liquido: r.liquido,
      percentualDesconto,
      isCurrentSalary: bruto === salarioAtual,
    }
  })
}
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
npm test
```

Expected: all tests pass including the previous aposentadoria tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/salario/calculations.ts src/lib/salario/calculations.test.ts
git commit -m "feat: add salary calculations — INSS/IRRF/decimo/comparativo with full test coverage"
```

---

### Task 7: Create useSalarioCalculations hook

**Files:**
- Create: `src/hooks/salario/useSalarioCalculations.ts`

- [ ] **Step 1: Create `src/hooks/salario/useSalarioCalculations.ts`**

```typescript
import { useMemo } from 'react'
import type { SalarioInputs, SalarioResult, DecimoResult, ComparativoRow } from '../../lib/salario/types'
import { calcSalarioLiquido, calcDecimo, calcComparativo } from '../../lib/salario/calculations'

export interface SalarioCalculations {
  result: SalarioResult
  decimo: DecimoResult | null
  comparativo: ComparativoRow[]
}

export function useSalarioCalculations(inputs: SalarioInputs): SalarioCalculations {
  return useMemo(() => {
    const result = calcSalarioLiquido(inputs.salarioBruto, inputs.dependentes)
    const decimo = inputs.incluiDecimo ? calcDecimo(inputs.salarioBruto) : null
    const comparativo = calcComparativo(inputs.salarioBruto, inputs.dependentes)
    return { result, decimo, comparativo }
  }, [inputs])
}
```

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/salario/useSalarioCalculations.ts
git commit -m "feat: add useSalarioCalculations hook"
```

---

### Task 8: Build salary calculator UI components

**Files:**
- Create: `src/calculators/salario/InputForm.tsx`
- Create: `src/calculators/salario/ResultCard.tsx`
- Create: `src/calculators/salario/ComparisonTable.tsx`

- [ ] **Step 1: Create `src/calculators/salario/InputForm.tsx`**

```typescript
import { useState } from 'react'
import type { SalarioInputs } from '../../lib/salario/types'

interface Props {
  onChange: (inputs: SalarioInputs) => void
}

function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatMoney(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InputForm({ onChange }: Props) {
  const [salarioBrutoStr, setSalarioBrutoStr] = useState('')
  const [inputs, setInputs] = useState<SalarioInputs>({
    salarioBruto: 0,
    dependentes: 0,
    incluiDecimo: false,
    showComparativo: false,
  })
  const [showDetalhes, setShowDetalhes] = useState(false)

  function update(patch: Partial<SalarioInputs>) {
    const next = { ...inputs, ...patch }
    setInputs(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
      <h2 className="text-lg font-semibold text-gray-700">Seus dados</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Salário bruto</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="5.000,00"
            value={salarioBrutoStr}
            onChange={e => {
              setSalarioBrutoStr(e.target.value)
              update({ salarioBruto: parseMoney(e.target.value) })
            }}
            onBlur={() => setSalarioBrutoStr(formatMoney(inputs.salarioBruto))}
          />
        </div>
      </label>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <button
          type="button"
          className="mx-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-white px-1 transition-colors"
          onClick={() => setShowDetalhes(v => !v)}
        >
          <span className="text-[10px]">{showDetalhes ? '▼' : '▶'}</span>
          Detalhes
        </button>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {showDetalhes && (
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Número de dependentes</span>
            <input
              type="number"
              min={0}
              max={20}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.dependentes}
              onChange={e => update({ dependentes: parseInt(e.target.value) || 0 })}
            />
            <span className="text-xs text-gray-400">Cada dependente deduz R$ 189,59 da base do IR</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={inputs.incluiDecimo}
              onChange={e => update({ incluiDecimo: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-600">Calcular 13º salário</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={inputs.showComparativo}
              onChange={e => update({ showComparativo: e.target.checked })}
            />
            <span className="text-sm font-medium text-gray-600">Mostrar comparativo por faixa</span>
          </label>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/calculators/salario/ResultCard.tsx`**

```typescript
import type { SalarioResult, DecimoResult } from '../../lib/salario/types'

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface RowProps {
  label: string
  value: string
  negative?: boolean
  muted?: boolean
  highlight?: boolean
}

function Row({ label, value, negative, muted, highlight }: RowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${muted ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <span
        className={`text-sm font-medium ${
          negative ? 'text-red-500' : highlight ? 'text-blue-700 text-base font-bold' : 'text-gray-800'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

interface Props {
  result: SalarioResult
  decimo: DecimoResult | null
}

export default function ResultCard({ result, decimo }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-700">Resultado mensal</h2>
      <div className="flex flex-col gap-2">
        <Row label="Salário bruto" value={fmt(result.bruto)} />
        <Row label="Desconto INSS" value={`− ${fmt(result.inss)}`} negative />
        <Row label="Base de cálculo IR" value={fmt(result.baseIRRF)} muted />
        <Row label="Desconto IR" value={`− ${fmt(result.irrf)}`} negative />
        <div className="border-t border-gray-100 pt-2">
          <Row label="Salário líquido" value={fmt(result.liquido)} highlight />
        </div>
      </div>

      {decimo && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mt-2">13º Salário</h2>
          <div className="flex flex-col gap-2">
            <Row label="13º bruto" value={fmt(decimo.bruto)} />
            <Row label="Desconto INSS" value={`− ${fmt(decimo.inss)}`} negative />
            <Row label="Desconto IR" value={`− ${fmt(decimo.irrf)}`} negative />
            <div className="border-t border-gray-100 pt-2">
              <Row label="13º líquido" value={fmt(decimo.liquido)} highlight />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/calculators/salario/ComparisonTable.tsx`**

```typescript
import type { ComparativoRow } from '../../lib/salario/types'

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  rows: ComparativoRow[]
}

export default function ComparisonTable({ rows }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Comparativo por faixa salarial</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 font-medium text-gray-500">Bruto</th>
              <th className="text-right py-2 font-medium text-gray-500">INSS</th>
              <th className="text-right py-2 font-medium text-gray-500">IR</th>
              <th className="text-right py-2 font-medium text-gray-500">Líquido</th>
              <th className="text-right py-2 font-medium text-gray-500">% Desc.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.bruto}
                className={`border-b border-gray-50 ${
                  row.isCurrentSalary ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2 text-gray-800">{fmt(row.bruto)}</td>
                <td className="py-2 text-right text-red-500">{fmt(row.inss)}</td>
                <td className="py-2 text-right text-red-500">{fmt(row.irrf)}</td>
                <td className="py-2 text-right text-blue-700 font-medium">{fmt(row.liquido)}</td>
                <td className="py-2 text-right text-gray-600">{row.percentualDesconto.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/calculators/salario/
git commit -m "feat: add salary calculator UI — InputForm, ResultCard, ComparisonTable"
```

---

### Task 9: Assemble SalarioPage and final smoke test

**Files:**
- Create: `src/pages/SalarioPage.tsx`
- Modify: `src/App.tsx` (add `/salario` route)

- [ ] **Step 1: Create `src/pages/SalarioPage.tsx`**

```typescript
import { useState, useCallback } from 'react'
import type { SalarioInputs } from '../lib/salario/types'
import { useSalarioCalculations } from '../hooks/salario/useSalarioCalculations'
import InputForm from '../calculators/salario/InputForm'
import ResultCard from '../calculators/salario/ResultCard'
import ComparisonTable from '../calculators/salario/ComparisonTable'

const DEFAULT_INPUTS: SalarioInputs = {
  salarioBruto: 0,
  dependentes: 0,
  incluiDecimo: false,
  showComparativo: false,
}

export default function SalarioPage() {
  const [inputs, setInputs] = useState<SalarioInputs>(DEFAULT_INPUTS)
  const { result, decimo, comparativo } = useSalarioCalculations(inputs)

  const handleChange = useCallback((next: SalarioInputs) => setInputs(next), [])

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Calculadora de Salário Líquido</h1>
          <p className="text-sm text-blue-200 mt-1">CLT Brasil — INSS e IR 2025</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleChange} />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            {inputs.salarioBruto > 0 ? (
              <>
                <ResultCard result={result} decimo={inputs.incluiDecimo ? decimo : null} />
                {inputs.showComparativo && <ComparisonTable rows={comparativo} />}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-3">💰</div>
                  <p className="text-base font-semibold text-slate-500">Digite seu salário bruto</p>
                  <p className="text-sm mt-1">Os resultados aparecerão aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Add `/salario` route to `src/App.tsx`**

```typescript
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AposentadoriaPage from './pages/AposentadoriaPage'
import SalarioPage from './pages/SalarioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="aposentadoria" element={<AposentadoriaPage />} />
        <Route path="salario" element={<SalarioPage />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Run type-check and all tests**

```bash
npx tsc --noEmit && npm test
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 4: Smoke test the full portal in the browser**

```bash
npm run dev
```

Verify the following golden paths:

**Home:**
- http://localhost:5173 → home page with 2 cards
- Both cards visible and styled correctly

**Aposentadoria:**
- Click card → navigates to `/aposentadoria`
- Calculator works as before (fill in data, see results, chart, table)
- "Seu Mapa Financeiro" nav link → back to home

**Salário — basic flow:**
- Click card → navigates to `/salario`
- Type `5000` in salário bruto → results appear immediately
- Verify: INSS = R$ 509,59 | Base IR = R$ 4.490,41 | IR = R$ 347,57 | Líquido = R$ 4.142,84

**Salário — detalhes section:**
- Click "Detalhes" → expands with 3 controls
- Add 2 dependentes → base IR decreases by R$ 379,18 (2 × R$ 189,59)
- Check "Calcular 13º salário" → 13th salary section appears in ResultCard
- Check "Mostrar comparativo por faixa" → comparison table appears with 8 rows, R$5.000 row highlighted

**Salário — high salary (INSS ceiling):**
- Type `10000` → INSS = R$ 951,63 | Líquido = R$ 7.456,07

- [ ] **Step 5: Stop dev server, commit**

```bash
git add -A
git commit -m "feat: add SalarioPage, wire /salario route — portal complete"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Covered by task |
|-----------------|----------------|
| react-router-dom v7 | Task 1 |
| Folder restructure | Task 2 |
| Layout with portal header | Task 3 |
| Home with 2 cards | Task 4 |
| AposentadoriaPage (no functional change) | Task 4 |
| Routes `/`, `/aposentadoria`, `/salario` | Tasks 3 + 9 |
| Salary input: salário bruto | Task 8 |
| Salary outputs: INSS, base IRRF, IRRF, líquido | Tasks 6 + 8 |
| Expandable "Detalhes" section | Task 8 |
| Dependentes deduction | Tasks 6 + 8 |
| 13º salary without dependent deduction | Tasks 6 + 8 |
| Comparativo table 8 brackets | Tasks 6 + 8 |
| Comparativo uses same dependent count | Task 6 |
| taxTables.ts with 2026 reform comment | Task 5 |
| Tests: INSS progressive, IRRF, 13th, comparativo | Task 6 |
| main.tsx BrowserRouter | Task 3 |
| App.tsx router shell | Task 3 |

### Placeholder scan

No TBDs, TODOs, or vague steps found. Every step includes exact file paths and complete code.

### Type consistency

All types defined in Task 5 (`SalarioInputs`, `SalarioResult`, `DecimoResult`, `ComparativoRow`) are used consistently across Tasks 6–9. Function signatures match between `calculations.ts`, `useSalarioCalculations.ts`, `ResultCard.tsx`, and `SalarioPage.tsx`.
