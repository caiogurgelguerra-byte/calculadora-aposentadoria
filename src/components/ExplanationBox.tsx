import type { CalculationResults, UserInputs } from '../lib/types'

interface Props {
  results: CalculationResults
  inputs: UserInputs
  selectedScenario: 'A' | 'B' | 'C'
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ACCENT = {
  A: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', highlight: 'text-blue-700 font-semibold' },
  B: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', highlight: 'text-emerald-700 font-semibold' },
  C: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', highlight: 'text-orange-700 font-semibold' },
}

export default function ExplanationBox({ results, inputs, selectedScenario }: Props) {
  const { idadeAtual, idadeAposentadoria, rendaMensal, expectativaVida } = inputs
  const s = ACCENT[selectedScenario]

  const scenario = results[`cenario${selectedScenario}` as 'cenarioA' | 'cenarioB' | 'cenarioC']
  const cenarioAUndefined = selectedScenario === 'A' && results.simulacao[0]?.cenarioA === null

  function renderText() {
    if (cenarioAUndefined) {
      return (
        <p className="text-sm text-gray-600 leading-relaxed">
          O Cenário A (Renda Perpétua) não pode ser calculado com rentabilidade de retirada em{' '}
          <span className={s.highlight}>0%</span>. Abra os{' '}
          <span className={s.highlight}>parâmetros avançados</span> e defina uma rentabilidade de retirada maior que zero.
        </p>
      )
    }

    if (scenario.metaJaAtingida) {
      const retirementText =
        selectedScenario === 'A'
          ? 'de forma vitalícia'
          : selectedScenario === 'B'
          ? 'até os 90 anos'
          : `até os ${expectativaVida} anos`

      return (
        <p className="text-sm text-gray-600 leading-relaxed">
          🎉 Parabéns! Seu patrimônio atual já é suficiente para se aposentar. Você poderá sacar{' '}
          <span className={s.highlight}>{fmt(rendaMensal)}/mês</span>{' '}
          {retirementText} sem precisar fazer nenhum aporte adicional.
        </p>
      )
    }

    const { aporteMensal, capitalNecessario } = scenario

    if (selectedScenario === 'A') {
      return (
        <p className="text-sm text-gray-600 leading-relaxed">
          Você precisará investir{' '}
          <span className={s.highlight}>{fmt(aporteMensal)}/mês</span>{' '}
          dos seus {idadeAtual} até os {idadeAposentadoria} anos para acumular um capital de{' '}
          <span className={s.highlight}>{fmt(capitalNecessario)}</span>.{' '}
          Com esse valor, você poderá sacar{' '}
          <span className={s.highlight}>{fmt(rendaMensal)}/mês</span>{' '}
          de forma <span className={s.highlight}>vitalícia</span>, sem nunca consumir o patrimônio principal.
        </p>
      )
    }

    if (selectedScenario === 'B') {
      return (
        <p className="text-sm text-gray-600 leading-relaxed">
          Você precisará investir{' '}
          <span className={s.highlight}>{fmt(aporteMensal)}/mês</span>{' '}
          dos seus {idadeAtual} até os {idadeAposentadoria} anos para acumular um capital de{' '}
          <span className={s.highlight}>{fmt(capitalNecessario)}</span>.{' '}
          Com esse valor, você poderá sacar{' '}
          <span className={s.highlight}>{fmt(rendaMensal)}/mês</span>{' '}
          da sua aposentadoria até os <span className={s.highlight}>90 anos</span>.
        </p>
      )
    }

    return (
      <p className="text-sm text-gray-600 leading-relaxed">
        Você precisará investir{' '}
        <span className={s.highlight}>{fmt(aporteMensal)}/mês</span>{' '}
        dos seus {idadeAtual} até os {idadeAposentadoria} anos para acumular um capital de{' '}
        <span className={s.highlight}>{fmt(capitalNecessario)}</span>.{' '}
        Com esse valor, você poderá sacar{' '}
        <span className={s.highlight}>{fmt(rendaMensal)}/mês</span>{' '}
        da sua aposentadoria até os{' '}
        <span className={s.highlight}>{expectativaVida} anos</span>.
      </p>
    )
  }

  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-3">
        <span className={`text-xl mt-0.5 ${s.icon}`}>💡</span>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Resumo — Cenário {selectedScenario}
          </p>
          {renderText()}
        </div>
      </div>
    </div>
  )
}
