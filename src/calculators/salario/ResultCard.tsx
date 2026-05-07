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
  const temHE = result.valorHE > 0
  const temOutrosDescontos = result.outrosDescontos > 0
  const temBeneficios = result.beneficios > 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-700">Resultado mensal</h2>
      <div className="flex flex-col gap-2">
        <Row label="Salário bruto" value={fmt(result.bruto)} />
        {temHE && (
          <>
            <Row label="+ Horas extras" value={`+ ${fmt(result.valorHE)}`} />
            <Row label="Bruto + HE" value={fmt(result.brutoTotal)} muted />
          </>
        )}
        <Row label="Desconto INSS" value={`− ${fmt(result.inss)}`} negative />
        <Row label="Base de cálculo IR" value={fmt(result.baseIRRF)} muted />
        <Row label="Desconto IR" value={`− ${fmt(result.irrf)}`} negative />
        {temOutrosDescontos && (
          <Row label="Outros descontos" value={`− ${fmt(result.outrosDescontos)}`} negative />
        )}
        {temBeneficios && (
          <Row label="+ Benefícios" value={`+ ${fmt(result.beneficios)}`} />
        )}
        <div className="border-t border-gray-100 pt-2">
          <Row
            label={temBeneficios || temOutrosDescontos ? 'Total recebido' : 'Salário líquido'}
            value={fmt(result.liquido)}
            highlight
          />
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
