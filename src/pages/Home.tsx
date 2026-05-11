import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandLockup'

const CALCULATORS = [
  {
    to: '/investimentos',
    tag: 'Mais usada',
    title: 'Calculadora de Investimentos',
    description: 'Compare seu investimento com poupanca, CDB e LCI/LCA.',
  },
  {
    to: '/aposentadoria',
    tag: 'Planejamento',
    title: 'Calculadora de Aposentadoria',
    description: 'Projete quanto poupar por mes para buscar a renda que voce quer.',
  },
  {
    to: '/salario',
    tag: 'Renda',
    title: 'Calculadora de Salario Liquido',
    description: 'Estime quanto cai na conta apos INSS e imposto de renda.',
  },
]

export default function Home() {
  return (
    <div className="bg-[#f6f7f9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <BrandMark className="mb-5 h-20 w-20" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Ferramentas abertas
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Meu Mapa Financeiro</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            O seu mapa financeiro em calculadoras simples para apoiar decisoes antes, durante e depois da consultoria.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950">O que voce procura?</h2>
          <p className="text-sm text-slate-500">Escolha uma ferramenta e comece sem cadastro.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CALCULATORS.map((calc) => (
            <Link
              key={calc.to}
              to={calc.to}
              className="flex min-h-44 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{calc.tag}</span>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{calc.title}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-500">{calc.description}</p>
              <span className="mt-auto pt-5 text-sm font-semibold text-emerald-700">Acessar {'->'}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
