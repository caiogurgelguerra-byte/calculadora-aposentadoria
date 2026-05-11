import { Link } from 'react-router-dom'

const CALCULATORS = [
  {
    to: '/aposentadoria',
    icon: 'R$',
    title: 'Calculadora de Aposentadoria',
    description: 'Descubra quanto poupar por mes para se aposentar com a renda que voce quer',
  },
  {
    to: '/salario',
    icon: 'R$',
    title: 'Calculadora de Salario Liquido',
    description: 'Veja exatamente quanto cai na sua conta apos INSS e IR',
  },
  {
    to: '/investimentos',
    icon: '%',
    title: 'Calculadora de Investimentos',
    description: 'Compare seu investimento com poupanca, CDB e LCI/LCA',
  },
]

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800">Seu Mapa Financeiro</h1>
        <p className="text-slate-500 mt-2">Ferramentas para planejar sua vida financeira</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {CALCULATORS.map((calc) => (
          <Link
            key={calc.to}
            to={calc.to}
            className="flex flex-col items-start gap-3 p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
          >
            <span className="text-3xl">{calc.icon}</span>
            <h2 className="text-lg font-semibold text-slate-800">{calc.title}</h2>
            <p className="text-sm text-slate-500">{calc.description}</p>
            <span className="mt-auto text-sm font-medium text-blue-600">Acessar {'->'}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
