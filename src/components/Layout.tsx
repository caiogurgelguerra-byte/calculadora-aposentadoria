import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-gradient-to-r from-blue-900 to-indigo-700 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="text-lg font-bold text-white tracking-tight hover:text-blue-200 transition-colors"
          >
            Seu Mapa Financeiro
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
