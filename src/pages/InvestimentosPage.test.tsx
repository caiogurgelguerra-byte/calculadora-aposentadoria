import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import Home from './Home'
import InvestimentosPage from './InvestimentosPage'

function renderPage() {
  return render(
    <BrowserRouter>
      <InvestimentosPage />
    </BrowserRouter>
  )
}

describe('InvestimentosPage', () => {
  it('starts with empty result state while CDI and IPCA are empty', () => {
    renderPage()
    expect(screen.getByText('Preencha os dados do investimento')).toBeInTheDocument()
  })

  it('renders result cards, chart, and table after valid input', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Valor inicial'), { target: { value: '10.000,00' } })
    fireEvent.change(screen.getByLabelText('CDI anual'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByLabelText('IPCA anual'), { target: { value: '4,50' } })
    fireEvent.change(screen.getByRole('textbox', { name: '% do CDI' }), { target: { value: '100' } })

    expect(screen.getByText('Valor liquido no resgate')).toBeInTheDocument()
    expect(screen.getByText('Evolucao bruta ao longo do prazo')).toBeInTheDocument()
    expect(screen.getByText('Comparativo liquido final dos investimentos')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-custom')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-cdb_100_cdi')).toBeInTheDocument()
  })

  it('shows validation error beside active empty rate field', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Valor inicial'), { target: { value: '10.000,00' } })
    fireEvent.change(screen.getByLabelText('CDI anual'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByLabelText('IPCA anual'), { target: { value: '4,50' } })
    fireEvent.click(screen.getByLabelText('Prefixado'))

    expect(screen.getByText('Informe a taxa prefixada.')).toBeInTheDocument()
  })
})

describe('route and home integration', () => {
  it('home links to investment calculator', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    )

    expect(screen.getByRole('link', { name: /calculadora de investimentos/i })).toHaveAttribute(
      'href',
      '/investimentos'
    )
  })

  it('app route renders investments page', () => {
    window.history.pushState({}, '', '/investimentos')
    render(<App />)
    expect(screen.getByRole('heading', { name: /calculadora de investimentos/i })).toBeInTheDocument()
  })
})
