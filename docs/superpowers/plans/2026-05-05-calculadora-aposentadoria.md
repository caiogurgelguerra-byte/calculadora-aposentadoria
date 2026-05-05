# Calculadora de Aposentadoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side React SPA that calculates monthly savings needed for retirement across three scenarios, with live recalculation, a projection chart, and a summary table.

**Architecture:** All state lives in `App.tsx`; pure financial math in `calculations.ts`; a single `useCalculations` hook derives all results via `useMemo`; four presentational components consume those results with no internal state except `selectedScenario` (hoisted to `App.tsx`).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Vitest

---

## File Map

| File | Role |
|------|------|
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/lib/calculations.ts` | Pure financial math functions |
| `src/hooks/useCalculations.ts` | useMemo hook — inputs → CalculationResults \| null |
| `src/components/InputForm.tsx` | All user inputs, emits UserInputs via onChange |
| `src/components/ScenarioCards.tsx` | 3 result cards with click-to-select |
| `src/components/ProjectionChart.tsx` | Recharts line chart, accumulation + withdrawal |
| `src/components/SummaryTable.tsx` | Annual table for selected scenario |
| `src/App.tsx` | Layout, state, wires components together |
| `src/main.tsx` | Vite entry point |
| `src/index.css` | Tailwind directives |
| `src/lib/calculations.test.ts` | Unit tests for all math functions |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd "C:\Users\Caio\Desktop\Teste"
npm create vite@latest . -- --template react-ts
npm install
```

Expected output: project files created, `npm install` completes without errors.

- [ ] **Step 2: Install dependencies**

```bash
npm install recharts
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to `package.json`**

Add to the `scripts` section:

```json
"test": "vitest run",
"test:ui": "vitest --ui"
```

- [ ] **Step 6: Replace `src/App.tsx` with a placeholder**

```tsx
export default function App() {
  return <div className="p-4 text-xl">Calculadora de Aposentadoria</div>
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:5173`, browser shows "Calculadora de Aposentadoria".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + Recharts + Vitest"
```

---

## Task 2: Types and pure financial calculations

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/calculations.ts`
- Create: `src/lib/calculations.test.ts`

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export interface UserInputs {
  rendaMensal: number
  idadeAtual: number
  idadeAposentadoria: number
  patrimonioAtual: number
  rentabilidadeAcumulacao: number // % a.a. real
  rentabilidadeRetirada: number   // % a.a. real
  expectativaVida: number
}

export interface ScenarioResult {
  nome: string
  capitalNecessario: number
  aporteMensal: number
  metaJaAtingida: boolean
}

export interface SimulationDataPoint {
  idade: number
  cenarioA: number | null // null only when r_ret = 0
  cenarioB: number
  cenarioC: number
}

export interface CalculationResults {
  cenarioA: ScenarioResult
  cenarioB: ScenarioResult
  cenarioC: ScenarioResult
  simulacao: SimulationDataPoint[]
}
```

- [ ] **Step 2: Write failing tests in `src/lib/calculations.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from './calculations'

describe('monthlyRate', () => {
  it('converts 6% a.a. to monthly', () => {
    expect(monthlyRate(6)).toBeCloseTo(0.004868, 5)
  })
  it('returns 0 for 0% a.a.', () => {
    expect(monthlyRate(0)).toBe(0)
  })
})

describe('capitalPerpetuidade', () => {
  it('returns null when r_ret is 0', () => {
    expect(capitalPerpetuidade(10000, 0)).toBeNull()
  })
  it('calculates C = renda / r for r > 0', () => {
    const r = monthlyRate(4)
    expect(capitalPerpetuidade(10000, r)).toBeCloseTo(10000 / r, 0)
  })
})

describe('capitalAnnuity', () => {
  it('uses renda * n when r = 0', () => {
    expect(capitalAnnuity(10000, 0, 360)).toBeCloseTo(3_600_000, 0)
  })
  it('calculates PV of annuity for r > 0', () => {
    const r = monthlyRate(4)
    const n = 300
    const expected = 10000 * ((1 - Math.pow(1 + r, -n)) / r)
    expect(capitalAnnuity(10000, r, n)).toBeCloseTo(expected, 0)
  })
})

describe('calcPMT', () => {
  it('returns 0 and metaJaAtingida=true when patrimonio already covers capital', () => {
    const result = calcPMT(1_000_000, 1_500_000, monthlyRate(6), 240)
    expect(result.metaJaAtingida).toBe(true)
    expect(result.aporteMensal).toBe(0)
  })
  it('calculates correct PMT for r_ac > 0', () => {
    const r = monthlyRate(6)
    const n = 360
    const capital = 3_000_000
    const patrimonio = 0
    const { aporteMensal } = calcPMT(capital, patrimonio, r, n)
    // Verify: PMT * FV_annuity = capital
    const fvAnnuity = (Math.pow(1 + r, n) - 1) / r
    expect(aporteMensal * fvAnnuity).toBeCloseTo(capital, -2)
  })
  it('calculates PMT = capital / n when r_ac = 0', () => {
    const { aporteMensal } = calcPMT(3_000_000, 0, 0, 360)
    expect(aporteMensal).toBeCloseTo(3_000_000 / 360, 2)
  })
})

describe('buildSimulation', () => {
  it('first point has patrimonio = patrimonioAtual for all scenarios', () => {
    const pts = buildSimulation(
      { aporteMensal: 1000, metaJaAtingida: false, capitalNecessario: 1_000_000, nome: 'A' },
      { aporteMensal: 800,  metaJaAtingida: false, capitalNecessario: 800_000,   nome: 'B' },
      { aporteMensal: 900,  metaJaAtingida: false, capitalNecessario: 900_000,   nome: 'C' },
      { rendaMensal: 10000, idadeAtual: 30, idadeAposentadoria: 60, patrimonioAtual: 50000,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 4, expectativaVida: 85 },
      false
    )
    expect(pts[0].idade).toBe(30)
    expect(pts[0].cenarioB).toBe(50000)
    expect(pts[0].cenarioC).toBe(50000)
  })
  it('sets cenarioA null throughout when cenarioAUndefined = true', () => {
    const pts = buildSimulation(
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 0, nome: 'A' },
      { aporteMensal: 800, metaJaAtingida: false, capitalNecessario: 800_000, nome: 'B' },
      { aporteMensal: 900, metaJaAtingida: false, capitalNecessario: 900_000, nome: 'C' },
      { rendaMensal: 10000, idadeAtual: 30, idadeAposentadoria: 60, patrimonioAtual: 0,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 0, expectativaVida: 85 },
      true
    )
    expect(pts.every(p => p.cenarioA === null)).toBe(true)
  })
  it('patrimonio never goes below 0 in withdrawal phase', () => {
    const pts = buildSimulation(
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'A' },
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'B' },
      { aporteMensal: 0, metaJaAtingida: false, capitalNecessario: 100_000, nome: 'C' },
      { rendaMensal: 50000, idadeAtual: 60, idadeAposentadoria: 60, patrimonioAtual: 100_000,
        rentabilidadeAcumulacao: 6, rentabilidadeRetirada: 4, expectativaVida: 85 },
      false
    )
    expect(pts.every(p => p.cenarioB >= 0)).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests — verify they all FAIL**

```bash
npm test
```

Expected: test failures with "Cannot find module './calculations'".

- [ ] **Step 4: Write `src/lib/calculations.ts`**

```ts
import type { ScenarioResult, SimulationDataPoint, UserInputs } from './types'

export function monthlyRate(annualPct: number): number {
  if (annualPct === 0) return 0
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1
}

export function capitalPerpetuidade(rendaMensal: number, rRet: number): number | null {
  if (rRet === 0) return null
  return rendaMensal / rRet
}

export function capitalAnnuity(rendaMensal: number, rRet: number, nMonths: number): number {
  if (rRet === 0) return rendaMensal * nMonths
  return rendaMensal * ((1 - Math.pow(1 + rRet, -nMonths)) / rRet)
}

export function calcPMT(
  capitalNecessario: number,
  patrimonioAtual: number,
  rAc: number,
  nAc: number
): { aporteMensal: number; metaJaAtingida: boolean } {
  const fvPatrimonio = patrimonioAtual * Math.pow(1 + rAc, nAc)
  if (fvPatrimonio >= capitalNecessario) {
    return { aporteMensal: 0, metaJaAtingida: true }
  }
  const gap = capitalNecessario - fvPatrimonio
  const pmt =
    rAc === 0
      ? gap / nAc
      : (gap * rAc) / (Math.pow(1 + rAc, nAc) - 1)
  return { aporteMensal: Math.max(0, pmt), metaJaAtingida: false }
}

function stepAccumulation(patrimonio: number, pmt: number, rAc: number): number {
  if (rAc === 0) return patrimonio + pmt * 12
  const factor = Math.pow(1 + rAc, 12)
  return patrimonio * factor + pmt * ((factor - 1) / rAc)
}

function stepWithdrawal(patrimonio: number, rendaMensal: number, rRet: number): number {
  if (rRet === 0) return Math.max(0, patrimonio - rendaMensal * 12)
  const factor = Math.pow(1 + rRet, 12)
  return Math.max(0, patrimonio * factor - rendaMensal * ((factor - 1) / rRet))
}

export function buildSimulation(
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  scenarioC: ScenarioResult,
  inputs: UserInputs,
  cenarioAUndefined: boolean
): SimulationDataPoint[] {
  const { rendaMensal, idadeAtual, idadeAposentadoria, patrimonioAtual,
          rentabilidadeAcumulacao, rentabilidadeRetirada, expectativaVida } = inputs
  const rAc = monthlyRate(rentabilidadeAcumulacao)
  const rRet = monthlyRate(rentabilidadeRetirada)
  const endAge = Math.max(90, expectativaVida)
  const points: SimulationDataPoint[] = []

  let patA = patrimonioAtual
  let patB = patrimonioAtual
  let patC = patrimonioAtual

  for (let age = idadeAtual; age <= endAge; age++) {
    points.push({
      idade: age,
      cenarioA: cenarioAUndefined ? null : patA,
      cenarioB: patB,
      cenarioC: patC,
    })
    if (age < idadeAposentadoria) {
      if (!cenarioAUndefined) patA = stepAccumulation(patA, scenarioA.aporteMensal, rAc)
      patB = stepAccumulation(patB, scenarioB.aporteMensal, rAc)
      patC = stepAccumulation(patC, scenarioC.aporteMensal, rAc)
    } else {
      if (!cenarioAUndefined) patA = stepWithdrawal(patA, rendaMensal, rRet)
      patB = stepWithdrawal(patB, rendaMensal, rRet)
      patC = stepWithdrawal(patC, rendaMensal, rRet)
    }
  }

  return points
}
```

- [ ] **Step 5: Run tests — verify they all PASS**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/calculations.ts src/lib/calculations.test.ts src/test-setup.ts
git commit -m "feat: add types and pure financial calculation functions with tests"
```

---

## Task 3: useCalculations hook

**Files:**
- Create: `src/hooks/useCalculations.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useMemo } from 'react'
import type { UserInputs, CalculationResults, ScenarioResult } from '../lib/types'
import {
  monthlyRate,
  capitalPerpetuidade,
  capitalAnnuity,
  calcPMT,
  buildSimulation,
} from '../lib/calculations'

function isValid(inputs: UserInputs): boolean {
  const { rendaMensal, idadeAtual, idadeAposentadoria, expectativaVida } = inputs
  return (
    rendaMensal > 0 &&
    idadeAtual >= 18 && idadeAtual <= 70 &&
    idadeAposentadoria > idadeAtual && idadeAposentadoria <= 80 &&
    expectativaVida > idadeAposentadoria
  )
}

export function useCalculations(inputs: UserInputs): CalculationResults | null {
  return useMemo(() => {
    if (!isValid(inputs)) return null

    const { rendaMensal, idadeAtual, idadeAposentadoria, patrimonioAtual,
            rentabilidadeAcumulacao, rentabilidadeRetirada, expectativaVida } = inputs

    const rAc  = monthlyRate(rentabilidadeAcumulacao)
    const rRet = monthlyRate(rentabilidadeRetirada)
    const nAc  = (idadeAposentadoria - idadeAtual) * 12

    // Capital needed at retirement
    const capAOrNull = capitalPerpetuidade(rendaMensal, rRet)
    const cenarioAUndefined = capAOrNull === null
    const capA = capAOrNull ?? 0

    const nB = (90 - idadeAposentadoria) * 12
    const capB = capitalAnnuity(rendaMensal, rRet, nB)

    const nC = (expectativaVida - idadeAposentadoria) * 12
    const capC = capitalAnnuity(rendaMensal, rRet, nC)

    // PMT per scenario
    const pmtA = cenarioAUndefined
      ? { aporteMensal: 0, metaJaAtingida: false }
      : calcPMT(capA, patrimonioAtual, rAc, nAc)
    const pmtB = calcPMT(capB, patrimonioAtual, rAc, nAc)
    const pmtC = calcPMT(capC, patrimonioAtual, rAc, nAc)

    const cenarioA: ScenarioResult = {
      nome: 'Renda Perpétua',
      capitalNecessario: capA,
      aporteMensal: pmtA.aporteMensal,
      metaJaAtingida: pmtA.metaJaAtingida,
    }
    const cenarioB: ScenarioResult = {
      nome: 'Período Fixo (90 anos)',
      capitalNecessario: capB,
      aporteMensal: pmtB.aporteMensal,
      metaJaAtingida: pmtB.metaJaAtingida,
    }
    const cenarioC: ScenarioResult = {
      nome: `Expectativa de Vida (${expectativaVida} anos)`,
      capitalNecessario: capC,
      aporteMensal: pmtC.aporteMensal,
      metaJaAtingida: pmtC.metaJaAtingida,
    }

    const simulacao = buildSimulation(cenarioA, cenarioB, cenarioC, inputs, cenarioAUndefined)

    return { cenarioA, cenarioB, cenarioC, simulacao }
  }, [inputs])
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalculations.ts
git commit -m "feat: add useCalculations hook"
```

---

## Task 4: InputForm component

**Files:**
- Create: `src/components/InputForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react'
import type { UserInputs } from '../lib/types'

interface Props {
  onChange: (inputs: UserInputs) => void
}

const DEFAULTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 6,
  rentabilidadeRetirada: 4,
  expectativaVida: 85,
}

function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatMoney(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InputForm({ onChange }: Props) {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULTS)
  const [showAdvanced, setShowAdvanced] = useState(false)

  function update<K extends keyof UserInputs>(key: K, value: UserInputs[K]) {
    const next = { ...inputs, [key]: value }
    setInputs(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
      <h2 className="text-lg font-semibold text-gray-700">Seus dados</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Renda mensal desejada</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="10.000,00"
            value={formatMoney(inputs.rendaMensal)}
            onChange={e => update('rendaMensal', parseMoney(e.target.value))}
          />
        </div>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-medium text-gray-600">Idade atual</span>
          <input
            type="number"
            min={18} max={70}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="30"
            value={inputs.idadeAtual || ''}
            onChange={e => update('idadeAtual', parseInt(e.target.value) || 0)}
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-sm font-medium text-gray-600">Aposentar-se com</span>
          <input
            type="number"
            min={19} max={80}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="60"
            value={inputs.idadeAposentadoria || ''}
            onChange={e => update('idadeAposentadoria', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">Patrimônio atual investido</span>
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <span className="text-gray-400 mr-1 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 outline-none text-sm"
            placeholder="0,00"
            value={formatMoney(inputs.patrimonioAtual)}
            onChange={e => update('patrimonioAtual', parseMoney(e.target.value))}
          />
        </div>
      </label>

      <button
        type="button"
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium w-fit"
        onClick={() => setShowAdvanced(v => !v)}
      >
        <span>{showAdvanced ? '▼' : '▶'}</span>
        Parâmetros avançados
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Rentabilidade real na acumulação (% a.a.)</span>
            <input
              type="number"
              step={0.1} min={0} max={30}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.rentabilidadeAcumulacao}
              onChange={e => update('rentabilidadeAcumulacao', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Rentabilidade real na retirada (% a.a.)</span>
            <input
              type="number"
              step={0.1} min={0} max={30}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.rentabilidadeRetirada}
              onChange={e => update('rentabilidadeRetirada', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Expectativa de vida (anos)</span>
            <input
              type="number"
              min={60} max={120}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.expectativaVida}
              onChange={e => update('expectativaVida', parseInt(e.target.value) || 85)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/InputForm.tsx
git commit -m "feat: add InputForm component"
```

---

## Task 5: ScenarioCards component

**Files:**
- Create: `src/components/ScenarioCards.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { CalculationResults } from '../lib/types'

interface Props {
  results: CalculationResults
  selectedScenario: 'A' | 'B' | 'C'
  onSelectScenario: (s: 'A' | 'B' | 'C') => void
}

const SCENARIO_STYLES = {
  A: { border: 'border-blue-500',  bg: 'bg-blue-50',  text: 'text-blue-700',  badge: 'bg-blue-500' },
  B: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-500' },
  C: { border: 'border-orange-500',bg: 'bg-orange-50',text: 'text-orange-700',badge: 'bg-orange-500' },
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface CardProps {
  id: 'A' | 'B' | 'C'
  nome: string
  capitalNecessario: number
  aporteMensal: number
  metaJaAtingida: boolean
  isUndefined?: boolean
  selected: boolean
  onSelect: () => void
}

function Card({ id, nome, capitalNecessario, aporteMensal, metaJaAtingida, isUndefined, selected, onSelect }: CardProps) {
  const s = SCENARIO_STYLES[id]
  return (
    <button
      onClick={onSelect}
      className={`flex-1 rounded-xl border-2 p-4 text-left transition-all cursor-pointer
        ${selected ? `${s.border} ${s.bg}` : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${s.badge}`}>{id}</span>
        <span className="text-xs font-medium text-gray-500 leading-tight">{nome}</span>
      </div>

      {isUndefined ? (
        <p className="text-sm font-semibold text-gray-500">Indefinido (capital infinito necessário)</p>
      ) : metaJaAtingida ? (
        <p className={`text-sm font-semibold ${s.text}`}>Meta já atingida! Seu patrimônio atual é suficiente.</p>
      ) : (
        <>
          <p className={`text-2xl font-bold ${s.text}`}>{fmt(aporteMensal)}<span className="text-sm font-normal">/mês</span></p>
          <p className="text-xs text-gray-400 mt-1">Capital necessário: {fmt(capitalNecessario)}</p>
        </>
      )}
    </button>
  )
}

export default function ScenarioCards({ results, selectedScenario, onSelectScenario }: Props) {
  const cenarioAUndefined = results.cenarioA.capitalNecessario === 0 && !results.cenarioA.metaJaAtingida && results.simulacao[0]?.cenarioA === null

  return (
    <div className="flex gap-3">
      <Card id="A" nome={results.cenarioA.nome} capitalNecessario={results.cenarioA.capitalNecessario}
        aporteMensal={results.cenarioA.aporteMensal} metaJaAtingida={results.cenarioA.metaJaAtingida}
        isUndefined={cenarioAUndefined} selected={selectedScenario === 'A'} onSelect={() => onSelectScenario('A')} />
      <Card id="B" nome={results.cenarioB.nome} capitalNecessario={results.cenarioB.capitalNecessario}
        aporteMensal={results.cenarioB.aporteMensal} metaJaAtingida={results.cenarioB.metaJaAtingida}
        selected={selectedScenario === 'B'} onSelect={() => onSelectScenario('B')} />
      <Card id="C" nome={results.cenarioC.nome} capitalNecessario={results.cenarioC.capitalNecessario}
        aporteMensal={results.cenarioC.aporteMensal} metaJaAtingida={results.cenarioC.metaJaAtingida}
        selected={selectedScenario === 'C'} onSelect={() => onSelectScenario('C')} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ScenarioCards.tsx
git commit -m "feat: add ScenarioCards component"
```

---

## Task 6: ProjectionChart component

**Files:**
- Create: `src/components/ProjectionChart.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { SimulationDataPoint } from '../lib/types'

interface Props {
  simulacao: SimulationDataPoint[]
  idadeAposentadoria: number
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProjectionChart({ simulacao, idadeAposentadoria }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Projeção do patrimônio</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={simulacao} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="idade" label={{ value: 'Idade', position: 'insideBottom', offset: -2 }} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 10 }} width={72} />
          <Tooltip
            formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            labelFormatter={(label) => `Idade: ${label}`}
          />
          <Legend verticalAlign="top" height={28} />
          <ReferenceLine x={idadeAposentadoria} stroke="#9ca3af" strokeDasharray="6 3" label={{ value: 'Aposentadoria', fontSize: 10, fill: '#6b7280' }} />
          <Line type="monotone" dataKey="cenarioA" name="A — Perpétua" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="cenarioB" name="B — 90 anos"  stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cenarioC" name="C — Expect. vida" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectionChart.tsx
git commit -m "feat: add ProjectionChart component"
```

---

## Task 7: SummaryTable component

**Files:**
- Create: `src/components/SummaryTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { SimulationDataPoint, CalculationResults, UserInputs } from '../lib/types'

interface Props {
  simulacao: SimulationDataPoint[]
  selectedScenario: 'A' | 'B' | 'C'
  results: CalculationResults
  inputs: UserInputs
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const HEADER_COLOR = { A: 'text-blue-600', B: 'text-green-600', C: 'text-orange-600' }

export default function SummaryTable({ simulacao, selectedScenario, results, inputs }: Props) {
  const scenario = results[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']
  const cenarioANull = selectedScenario === 'A' && simulacao.length > 0 && simulacao[0].cenarioA === null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className={`text-sm font-semibold mb-3 ${HEADER_COLOR[selectedScenario]}`}>
        Projeção anual — Cenário {selectedScenario}: {scenario.nome}
      </h3>
      <div className="overflow-y-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Idade</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Patrimônio</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Aporte Mensal</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Saque Mensal</th>
            </tr>
          </thead>
          <tbody>
            {simulacao.map((ponto) => {
              const isWithdrawal = ponto.idade >= inputs.idadeAposentadoria
              const patrimonioVal = ponto[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']

              const patrimonioStr = cenarioANull ? '—' : fmt(patrimonioVal as number)
              const aporteStr = cenarioANull ? '—' : isWithdrawal ? fmt(0) : fmt(scenario.aporteMensal)
              const saqueStr = cenarioANull
                ? (isWithdrawal ? fmt(inputs.rendaMensal) : '—')
                : isWithdrawal ? fmt(inputs.rendaMensal) : fmt(0)

              return (
                <tr key={ponto.idade} className={`border-b border-gray-50 ${isWithdrawal ? 'bg-red-50/30' : ''}`}>
                  <td className="py-1 px-2 font-medium text-gray-700">{ponto.idade}</td>
                  <td className="py-1 px-2 text-right text-gray-700">{patrimonioStr}</td>
                  <td className="py-1 px-2 text-right text-gray-500">{aporteStr}</td>
                  <td className="py-1 px-2 text-right text-gray-500">{saqueStr}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SummaryTable.tsx
git commit -m "feat: add SummaryTable component"
```

---

## Task 8: Wire everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` with the full layout**

```tsx
import { useState, useCallback } from 'react'
import type { UserInputs } from './lib/types'
import { useCalculations } from './hooks/useCalculations'
import InputForm from './components/InputForm'
import ScenarioCards from './components/ScenarioCards'
import ProjectionChart from './components/ProjectionChart'
import SummaryTable from './components/SummaryTable'

const DEFAULT_INPUTS: UserInputs = {
  rendaMensal: 0,
  idadeAtual: 0,
  idadeAposentadoria: 0,
  patrimonioAtual: 0,
  rentabilidadeAcumulacao: 6,
  rentabilidadeRetirada: 4,
  expectativaVida: 85,
}

export default function App() {
  const [inputs, setInputs] = useState<UserInputs>(DEFAULT_INPUTS)
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'C'>('A')
  const results = useCalculations(inputs)

  const handleInputChange = useCallback((next: UserInputs) => {
    setInputs(next)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Calculadora de Aposentadoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todos os valores em termos reais (já descontada a inflação)</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — inputs */}
          <div className="lg:w-80 shrink-0">
            <InputForm onChange={handleInputChange} />
          </div>

          {/* Right column — results */}
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
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">Preencha seus dados</p>
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run dev
```

Open `http://localhost:5173`. Test:
- Fill in: Renda R$ 10.000, Idade 30, Aposentar-se 60 → 3 cards appear with different monthly amounts
- Clicking each card highlights it and updates the table below
- Expand "Parâmetros avançados" → change a rate → cards update immediately
- Resize browser to mobile width → inputs stack above results
- Set Patrimônio atual to a very large value (e.g., R$ 10.000.000) → at least one card shows "Meta já atingida"

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire all components in App — retirement calculator complete"
```

---

## Task 9: Edge case smoke tests

**Files:**
- Modify: `src/lib/calculations.test.ts`

- [ ] **Step 1: Add edge case tests**

Append to `src/lib/calculations.test.ts`:

```ts
describe('edge cases', () => {
  it('capitalAnnuity: r=0, n=300 returns renda * 300', () => {
    expect(capitalAnnuity(10000, 0, 300)).toBe(3_000_000)
  })

  it('calcPMT: r_ac=0 returns (capital - patrimonio) / n', () => {
    const { aporteMensal, metaJaAtingida } = calcPMT(1_200_000, 0, 0, 360)
    expect(metaJaAtingida).toBe(false)
    expect(aporteMensal).toBeCloseTo(1_200_000 / 360, 2)
  })

  it('calcPMT: negative gap (FV_patrimonio > capital) returns metaJaAtingida=true', () => {
    const { metaJaAtingida } = calcPMT(500_000, 2_000_000, monthlyRate(6), 240)
    expect(metaJaAtingida).toBe(true)
  })

  it('buildSimulation: cenarioB and cenarioC never go negative', () => {
    const tiny: ScenarioResult = { nome: '', capitalNecessario: 1000, aporteMensal: 0, metaJaAtingida: false }
    const pts = buildSimulation(tiny, tiny, tiny, {
      rendaMensal: 100_000, idadeAtual: 65, idadeAposentadoria: 65,
      patrimonioAtual: 1_000, rentabilidadeAcumulacao: 6,
      rentabilidadeRetirada: 4, expectativaVida: 90,
    }, false)
    expect(pts.every(p => p.cenarioB >= 0 && p.cenarioC >= 0)).toBe(true)
  })
})
```

Add the missing import at the top of the test file:

```ts
import type { ScenarioResult } from './types'
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calculations.test.ts
git commit -m "test: add edge case smoke tests for financial calculations"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| React + TS + Vite + Tailwind + Recharts | Task 1 |
| `types.ts` interfaces | Task 2 |
| Pure calculation functions + tests | Task 2 |
| `useCalculations` hook | Task 3 |
| InputForm with all fields, advanced toggle | Task 4 |
| 3 scenario cards with click-to-select | Task 5 |
| Projection chart with retirement reference line | Task 6 |
| Summary table for selected scenario | Task 7 |
| Side-by-side layout, mobile responsive | Task 8 |
| `useCalculations` returns null → results hidden | Task 8 |
| "Meta já atingida" state | Task 5, 7 |
| `r_ret = 0` → Cenário A undefined | Task 3, 5 |
| `r_ac = 0` degeneration | Task 2, 3 |
| `max(0,...)` clamp in withdrawal | Task 2 |
| `pt-BR` currency formatting | Task 4, 5, 7 |
| Edge case smoke tests | Task 9 |

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** All components use `UserInputs`, `CalculationResults`, `SimulationDataPoint`, `ScenarioResult` as defined in Task 2. Prop names match spec (`results:`, `simulacao:`, `selectedScenario:`, `inputs:`).
