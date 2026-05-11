import { Link, NavLink, Outlet } from 'react-router-dom'
import { whatsappUrl } from '../lib/contact/whatsapp'
import { BrandLockup } from './BrandLockup'
import { Footer } from './Footer'

const navLinks = [
  { to: '/', label: 'Ferramentas' },
  { to: '/investimentos', label: 'Investimentos' },
  { to: '/aposentadoria', label: 'Aposentadoria' },
  { to: '/salario', label: 'Salario' },
]

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f7f9] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="flex items-center gap-3 text-slate-900 hover:text-slate-700 transition-colors">
            <BrandLockup />
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
            <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Navegacao principal">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl('duvida_geral')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Falar no WhatsApp
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                Area do cliente
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
