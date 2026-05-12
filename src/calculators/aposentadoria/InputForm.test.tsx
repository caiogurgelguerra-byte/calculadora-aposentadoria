import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InputForm from './InputForm'
import ScenarioCards from './ScenarioCards'
import type { CalculationResults } from '../../lib/aposentadoria/types'

function buildResults(): CalculationResults {
  return {
    cenarioA: { nome: 'A', capitalNecessario: 1000, aporteMensal: 200, metaJaAtingida: false },
    cenarioB: { nome: 'B', capitalNecessario: 2000, aporteMensal: 300, metaJaAtingida: false },
    cenarioC: { nome: 'C', capitalNecessario: 3000, aporteMensal: 400, metaJaAtingida: false },
    simulacao: [{ idade: 30, cenarioA: 100, cenarioB: 100, cenarioC: 100 }],
  }
}

describe('InputForm', () => {
  it('keeps monthly income free while typing and formats it on blur', () => {
    const onChange = vi.fn()
    render(<InputForm onChange={onChange} />)

    const rendaInput = screen.getByPlaceholderText('10.000,00')

    fireEvent.change(rendaInput, { target: { value: '12345,67' } })
    expect(screen.getByDisplayValue('12345,67')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rendaMensal: 12345.67 }))

    fireEvent.blur(rendaInput)
    expect(screen.getByDisplayValue('12.345,67')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rendaMensal: 12345.67 }))

    fireEvent.change(rendaInput, { target: { value: '10000' } })
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rendaMensal: 10000 }))

    fireEvent.blur(rendaInput)
    expect(screen.getByDisplayValue('10.000,00')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rendaMensal: 10000 }))
  })

  it('keeps current wealth free while typing and formats it on blur', () => {
    const onChange = vi.fn()
    render(<InputForm onChange={onChange} />)

    const patrimonioInput = screen.getByPlaceholderText('0,00')

    fireEvent.change(patrimonioInput, { target: { value: '12345,67' } })
    expect(screen.getByDisplayValue('12345,67')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ patrimonioAtual: 12345.67 }))

    fireEvent.blur(patrimonioInput)
    expect(screen.getByDisplayValue('12.345,67')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ patrimonioAtual: 12345.67 }))

    fireEvent.change(patrimonioInput, { target: { value: '155500' } })
    expect(screen.getByDisplayValue('155500')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ patrimonioAtual: 155500 }))

    fireEvent.blur(patrimonioInput)
    expect(screen.getByDisplayValue('155.500,00')).toBeInTheDocument()
  })
})

describe('ScenarioCards', () => {
  it('uses a stacked layout on mobile and a 3-column grid on larger screens', () => {
    const { container } = render(
      <ScenarioCards results={buildResults()} selectedScenario="A" onSelectScenario={() => {}} />
    )

    expect(container.firstChild).toHaveClass('grid')
    expect(container.firstChild).toHaveClass('grid-cols-1')
    expect(container.firstChild).toHaveClass('md:grid-cols-3')
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })
})
