import type { CalculationResults } from '../../lib/aposentadoria/types'

interface Props {
  results: CalculationResults
  selectedScenario: 'A' | 'B' | 'C'
  onSelectScenario: (s: 'A' | 'B' | 'C') => void
}

const SCENARIO_STYLES = {
  A: {
    border: 'border-blue-500',
    selectedBg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    text: 'text-blue-700',
    subtext: 'text-blue-400',
    badge: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    icon: '∞',
    iconColor: 'text-blue-300',
    iconSelectedColor: 'text-blue-500',
    shadow: 'shadow-blue-100',
  },
  B: {
    border: 'border-emerald-500',
    selectedBg: 'bg-gradient-to-br from-emerald-50 to-green-100',
    text: 'text-emerald-700',
    subtext: 'text-emerald-400',
    badge: 'bg-gradient-to-r from-emerald-500 to-green-600',
    icon: '90',
    iconColor: 'text-emerald-200',
    iconSelectedColor: 'text-emerald-400',
    shadow: 'shadow-emerald-100',
  },
  C: {
    border: 'border-orange-500',
    selectedBg: 'bg-gradient-to-br from-orange-50 to-amber-100',
    text: 'text-orange-700',
    subtext: 'text-orange-400',
    badge: 'bg-gradient-to-r from-orange-500 to-amber-500',
    icon: '♡',
    iconColor: 'text-orange-200',
    iconSelectedColor: 'text-orange-400',
    shadow: 'shadow-orange-100',
  },
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
      className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer min-h-36
        ${selected
          ? `${s.border} ${s.selectedBg} shadow-lg ${s.shadow} md:scale-[1.02]`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md md:hover:scale-[1.01]'
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${s.badge}`}>{id}</span>
          <span className="text-xs font-medium text-gray-500 leading-tight">{nome}</span>
        </div>
        <span className={`text-2xl font-bold leading-none transition-colors ${selected ? s.iconSelectedColor : s.iconColor}`}>
          {s.icon}
        </span>
      </div>

      {isUndefined ? (
        <p className="text-sm font-semibold text-gray-400">Capital infinito necessário</p>
      ) : metaJaAtingida ? (
        <div>
          <p className={`text-sm font-bold ${s.text}`}>Meta já atingida!</p>
          <p className="text-xs text-gray-400 mt-0.5">Seu patrimônio atual é suficiente.</p>
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold ${s.text}`}>
            {fmt(aporteMensal)}
            <span className="text-sm font-normal text-gray-400">/mês</span>
          </p>
          <p className={`text-xs mt-1 ${selected ? s.subtext : 'text-gray-400'}`}>
            Capital necessário: {fmt(capitalNecessario)}
          </p>
        </>
      )}
    </button>
  )
}

export default function ScenarioCards({ results, selectedScenario, onSelectScenario }: Props) {
  const cenarioAUndefined = results.cenarioA.capitalNecessario === 0 && !results.cenarioA.metaJaAtingida && results.simulacao[0]?.cenarioA === null

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
