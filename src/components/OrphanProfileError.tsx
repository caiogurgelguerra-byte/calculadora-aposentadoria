import { whatsappUrl } from '../lib/contact/whatsapp';
import { signOut } from '../lib/auth/mutations';

interface Props { email?: string }

export function OrphanProfileError({ email }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 tabIndex={-1} className="text-2xl font-semibold text-gray-900 mb-2">
          Encontramos um problema com seu cadastro
        </h1>
        <p className="text-gray-600 mb-6">
          Por favor, fale comigo no WhatsApp para resolvermos.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl('orfao', { email: email || '' })}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Falar no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => { void signOut().then(() => { window.location.href = '/'; }); }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
