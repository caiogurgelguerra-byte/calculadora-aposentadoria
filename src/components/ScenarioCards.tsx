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
