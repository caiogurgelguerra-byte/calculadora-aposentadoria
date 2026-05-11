import { useState } from 'react'

const LOGO_SRC = '/logo-meu-mapa-financeiro.png'

interface BrandMarkProps {
  className?: string
}

interface BrandLockupProps {
  className?: string
  showSubtitle?: boolean
}

export function BrandMark({ className = '' }: BrandMarkProps) {
  const [logoFailed, setLogoFailed] = useState(false)

  if (logoFailed) {
    return (
      <span
        aria-hidden="true"
        className={`flex items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white ${className}`}
      >
        MMF
      </span>
    )
  }

  return (
    <img
      src={LOGO_SRC}
      alt=""
      className={`object-contain ${className}`}
      onError={() => setLogoFailed(true)}
    />
  )
}

export function BrandLockup({ className = '', showSubtitle = true }: BrandLockupProps) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <BrandMark className="h-10 w-10 shrink-0" />
      <span>
        <span className="block text-sm font-semibold leading-tight">Meu Mapa Financeiro</span>
        {showSubtitle ? (
          <span className="block text-xs text-slate-500">O seu mapa financeiro em ferramentas simples</span>
        ) : null}
      </span>
    </span>
  )
}
