import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import Home from './Home'
import InvestimentosPage from './InvestimentosPage'

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
})

afterEach(() => {
  vi.restoreAllMocks()
})

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
    fireEvent.change(screen.getByLabelText('CDI medio projetado'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByRole('textbox', { name: '% do CDI' }), { target: { value: '100' } })
    fireEvent.change(screen.getByRole('textbox', { name: '% do CDI do CDB' }), { target: { value: '100' } })
    fireEvent.change(screen.getByRole('textbox', { name: '% do CDI da LCI/LCA' }), { target: { value: '85' } })

    expect(screen.getByText('Valor liquido no resgate')).toBeInTheDocument()
    expect(screen.getByText('Evolucao bruta ao longo do prazo')).toBeInTheDocument()
    expect(screen.getByText('Comparativo liquido final dos investimentos')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-custom')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-row-cdb_100_cdi')).toBeInTheDocument()
  })

  it('shows validation error beside active empty rate field', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Valor inicial'), { target: { value: '10.000,00' } })
    fireEvent.change(screen.getByLabelText('CDI medio projetado'), { target: { value: '10,65' } })
    fireEvent.change(screen.getByRole('textbox', { name: '% do CDI do CDB' }), { target: { value: '' } })
    fireEvent.click(screen.getByLabelText('Prefixado'))

    expect(screen.getByText('Informe a taxa prefixada.')).toBeInTheDocument()
  })

  it('shows IPCA input only for IPCA plus simulations', () => {
    renderPage()

    expect(screen.queryByLabelText('IPCA anual')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('IPCA + taxa'))
    expect(screen.getByLabelText('IPCA anual')).toBeInTheDocument()
  })

  it('formats money input on blur and loads projected CDI automatically', async () => {
    vi.stubEnv('VITE_ENABLE_PUBLIC_BCB_FOCUS_FETCH', 'true')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [
          { Indicador: 'Selic', Data: '2026-05-09', DataReferencia: '2026', Mediana: 13 },
          { Indicador: 'Selic', Data: '2026-05-09', DataReferencia: '2027', Mediana: 11 },
          { Indicador: 'Selic', Data: '2026-05-09', DataReferencia: '2028', Mediana: 10 },
        ],
      }),
    } as Response)

    renderPage()

    const amountInput = screen.getByLabelText('Valor inicial')
    fireEvent.focus(amountInput)
    fireEvent.change(amountInput, { target: { value: '1000' } })
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
    fireEvent.blur(amountInput)

    expect(screen.getByDisplayValue('1.000,00')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('13')).toBeInTheDocument()
  })

  it('shows editable benchmark inputs for CDB and LCI LCA', () => {
    renderPage()

    expect(screen.getByText('Premissas de comparacao')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '% do CDI do CDB' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '% do CDI da LCI/LCA' })).toBeInTheDocument()
  })

  it('shows local default helper text when public BCB fetch is disabled', () => {
    renderPage()

    expect(
      screen.getByText('Este e o CDI medio considerado para o prazo escolhido. Voce pode ajustar.')
    ).toBeInTheDocument()
    expect(globalThis.fetch).not.toHaveBeenCalled()
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

  it('app route renders investments page', async () => {
    window.history.pushState({}, '', '/investimentos')
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /calculadora de investimentos/i })
    ).toBeInTheDocument()
  })
})
