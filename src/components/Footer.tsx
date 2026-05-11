import { Link } from 'react-router-dom'
import { whatsappUrl } from '../lib/contact/whatsapp'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto text-center text-sm text-gray-600 space-y-1">
        <p>© 2026 Seu Mapa Financeiro · Caio Gurgel Guerra</p>
        <p>
          <Link to="/privacidade" className="hover:text-gray-900">
            Politica de Privacidade
          </Link>
          {' · '}
          <Link to="/termos" className="hover:text-gray-900">
            Termos de Uso
          </Link>
          {' · '}
          <a href={whatsappUrl('duvida_geral')} target="_blank" rel="noreferrer" className="hover:text-gray-900">
            WhatsApp
          </a>
        </p>
      </div>
    </footer>
  )
}
